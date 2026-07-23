import { describe, expect, it } from 'vitest';
import { upsampleBilinear } from './renderOverlay';

describe('upsampleBilinear', () => {
  it('produces the requested output size', () => {
    const cam = new Float32Array(25).fill(0.5); // 5x5
    const out = upsampleBilinear(cam, 5, 5, 40);
    expect(out.length).toBe(40 * 40);
  });

  it('preserves a uniform field exactly', () => {
    const cam = new Float32Array(9).fill(0.7); // 3x3
    const out = upsampleBilinear(cam, 3, 3, 30);
    for (const v of out) {
      expect(v).toBeCloseTo(0.7, 5);
    }
  });

  it('stays within the input value range (no overshoot)', () => {
    const cam = new Float32Array([0, 1, 0, 1, 0, 1, 0, 1, 0]); // 3x3 checkerboard
    const out = upsampleBilinear(cam, 3, 3, 50);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...out)).toBeLessThanOrEqual(1);
  });

  it('interpolates smoothly rather than producing hard blocks', () => {
    const cam = new Float32Array([0, 1, 0, 1, 0, 1, 0, 1, 0]);
    const out = upsampleBilinear(cam, 3, 3, 60);
    // Two adjacent output pixels should never jump by the full [0,1] range —
    // that would indicate nearest-neighbor blockiness, not interpolation.
    let maxJump = 0;
    for (let i = 1; i < out.length; i++) {
      maxJump = Math.max(maxJump, Math.abs(out[i] - out[i - 1]));
    }
    expect(maxJump).toBeLessThan(0.5);
  });
});
