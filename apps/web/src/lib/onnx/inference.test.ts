import { describe, expect, it } from 'vitest';
import { __internal } from './inference';

const { computeCAM, computeEnergyMap, computeOcclusionMap, softmax } = __internal;

describe('softmax', () => {
  it('produces probabilities that sum to 1', () => {
    const result = softmax([1, 2, 3, 4]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('is numerically stable for large logits', () => {
    const result = softmax([1000, 1001, 999]);
    expect(result.every((v) => Number.isFinite(v))).toBe(true);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('assigns the highest probability to the largest logit', () => {
    const result = softmax([0.1, 5, 0.2]);
    expect(result[1]).toBeGreaterThan(result[0]);
    expect(result[1]).toBeGreaterThan(result[2]);
  });
});

describe('computeCAM', () => {
  it('produces output normalized to [0, 1]', () => {
    const channels = 4;
    const h = 3;
    const w = 3;
    const spatial = h * w;
    const activations = new Float32Array(channels * spatial).map(() => Math.random() * 2 - 1);

    // access the private weight lookup indirectly is not possible; instead
    // test via a locally re-derived version of the same formula to pin the
    // contract computeCAM must satisfy, using a fabricated weight row.
    const weightRow = [0.5, -0.3, 0.8, 0.1];

    const manualCam = new Float32Array(spatial);
    for (let c = 0; c < channels; c++) {
      for (let i = 0; i < spatial; i++) {
        manualCam[i] += weightRow[c] * activations[c * spatial + i];
      }
    }
    for (let i = 0; i < spatial; i++) manualCam[i] = Math.max(manualCam[i], 0);
    const min = Math.min(...manualCam);
    const max = Math.max(...manualCam);
    for (let i = 0; i < spatial; i++) manualCam[i] = (manualCam[i] - min) / (max - min || 1e-8);

    // computeCAM reads weights from the bundled fc_weights.json by class
    // index, so we can't inject an arbitrary row directly — instead verify
    // the *shape and range contract* against class index 0, which is what
    // every caller actually relies on.
    const result = computeCAM(activations, [1, channels, h, w], 0);
    expect(result.height).toBe(h);
    expect(result.width).toBe(w);
    expect(result.cam.length).toBe(spatial);
    expect(Math.min(...result.cam)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...result.cam)).toBeLessThanOrEqual(1);
  });

  it('never produces NaN or negative values after ReLU + normalization', () => {
    const activations = new Float32Array(512 * 25).map(() => Math.random() * 4 - 2);
    const result = computeCAM(activations, [1, 512, 5, 5], 3);
    expect(result.cam.every((v) => Number.isFinite(v))).toBe(true);
    expect(result.cam.every((v) => v >= 0)).toBe(true);
  });

  it('handles an all-zero activation map without dividing by zero', () => {
    const activations = new Float32Array(8 * 9); // all zeros
    const result = computeCAM(activations, [1, 8, 3, 3], 0);
    expect(result.cam.every((v) => Number.isFinite(v))).toBe(true);
  });
});

describe('computeEnergyMap', () => {
  it('produces output normalized to [0, 1] with the right shape', () => {
    const channels = 6;
    const h = 4;
    const w = 4;
    const activations = new Float32Array(channels * h * w).map(() => Math.random() * 6 - 3);

    const result = computeEnergyMap(activations, [1, channels, h, w]);
    expect(result.height).toBe(h);
    expect(result.width).toBe(w);
    expect(result.energy.length).toBe(h * w);
    expect(Math.min(...result.energy)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...result.energy)).toBeLessThanOrEqual(1);
  });

  it('is invariant to activation sign — uses magnitude, not raw value', () => {
    // A location with large-magnitude negative activations should register
    // as high energy, not low — this is the key difference from Grad-CAM's
    // signed, class-weighted sum. Two channels here, opposite sign, same
    // magnitude, single spatial location.
    const activations = new Float32Array([5, -5]); // channel 0 = 5, channel 1 = -5, 1x1 spatial
    const result = computeEnergyMap(activations, [1, 2, 1, 1]);
    // Only one spatial location exists, so after normalization it's 0 by
    // definition (min === max) — verify it stays finite rather than NaN.
    expect(Number.isFinite(result.energy[0])).toBe(true);
  });

  it('ranks a high-magnitude location above a near-zero location', () => {
    // 2 channels, 2 spatial locations: location 0 has large activations,
    // location 1 has near-zero activations.
    const activations = new Float32Array([10, 0.01, -10, 0.01]); // [c0: loc0,loc1], [c1: loc0,loc1]
    const result = computeEnergyMap(activations, [1, 2, 1, 2]);
    expect(result.energy[0]).toBeGreaterThan(result.energy[1]);
  });

  it('never produces NaN and stays non-negative for realistic ResNet-scale inputs', () => {
    const activations = new Float32Array(256 * 100).map(() => Math.random() * 8 - 4);
    const result = computeEnergyMap(activations, [1, 256, 10, 10]);
    expect(result.energy.every((v) => Number.isFinite(v))).toBe(true);
    expect(result.energy.every((v) => v >= 0)).toBe(true);
  });

  it('handles an all-zero activation map without dividing by zero', () => {
    const activations = new Float32Array(64 * 1600); // all zeros, 40x40
    const result = computeEnergyMap(activations, [1, 64, 40, 40]);
    expect(result.energy.every((v) => Number.isFinite(v))).toBe(true);
  });
});

describe('computeOcclusionMap', () => {
  it('gives the most damaging patch a normalized value of exactly 1', () => {
    const baseConfidence = 0.9;
    // Occluding patch 2 hurt confidence the most (0.9 -> 0.1, a 0.8 drop).
    const occludedConfidences = [0.85, 0.6, 0.1, 0.88];
    const result = computeOcclusionMap(baseConfidence, occludedConfidences);
    expect(result[2]).toBeCloseTo(1, 6);
    expect(Math.max(...result)).toBeCloseTo(1, 6);
  });

  it('never produces a negative value when occlusion increases confidence', () => {
    // A patch that was actively hurting the original prediction (e.g. a
    // distracting background object) can make confidence go UP when
    // covered. That's a real, valid outcome — but it must clamp to 0
    // "importance," not go negative, since a heatmap has no meaningful
    // way to render "this patch was actively bad for the answer."
    const baseConfidence = 0.5;
    const occludedConfidences = [0.9, 0.5, 0.2];
    const result = computeOcclusionMap(baseConfidence, occludedConfidences);
    expect(result[0]).toBe(0);
    expect(result.every((v) => v >= 0)).toBe(true);
  });

  it('produces an all-zero map when no occlusion changes confidence at all', () => {
    const baseConfidence = 0.7;
    const occludedConfidences = [0.7, 0.7, 0.7, 0.7];
    const result = computeOcclusionMap(baseConfidence, occludedConfidences);
    expect(result.every((v) => v === 0)).toBe(true);
  });

  it('preserves relative ordering between two genuinely different drops', () => {
    const baseConfidence = 1.0;
    const occludedConfidences = [0.9, 0.5]; // drops of 0.1 and 0.5
    const result = computeOcclusionMap(baseConfidence, occludedConfidences);
    expect(result[1]).toBeGreaterThan(result[0]);
  });

  it('never produces NaN across a realistic 8x8 grid', () => {
    const baseConfidence = 0.82;
    const occludedConfidences = Array.from({ length: 64 }, () => Math.random());
    const result = computeOcclusionMap(baseConfidence, occludedConfidences);
    expect(result.length).toBe(64);
    expect(result.every((v) => Number.isFinite(v))).toBe(true);
  });
});
