import { getSession } from './session';
import { imageToTensor } from './preprocess';
import classLabelsData from '../../data/classLabels.json';
import fcWeightsData from '../../data/fcWeights.json';
import stageMetadata from '../../data/stageMetadata.json';

export const CLASS_LABELS: string[] = classLabelsData;

interface FcWeights {
  weight: number[][]; // [numClasses, numChannels]
  bias: number[];
  shape: [number, number];
}
const FC_WEIGHTS = fcWeightsData as FcWeights;

interface StageInfo {
  name: string;
  label: string;
  shape: (string | number)[];
}
const STAGES = stageMetadata as StageInfo[];

const LOGITS_OUTPUT = 'logits';
const ACTIVATION_OUTPUT = '/backbone/layer4/layer4.1/relu_1/Relu_output_0';

export interface ClassificationResult {
  predictedIndex: number;
  predictedLabel: string;
  confidence: number;
  probabilities: number[]; // aligned with CLASS_LABELS
}

export interface GradCamResult {
  /** Row-major [H, W] values in [0, 1], H and W are the raw activation map size (5x5 for this model). */
  cam: Float32Array;
  height: number;
  width: number;
}

function softmax(logits: Float32Array | number[]): number[] {
  const arr = Array.from(logits);
  const max = Math.max(...arr);
  const exps = arr.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * Computes Grad-CAM as a pure forward-only operation.
 *
 * This model's architecture ends in Global-Average-Pool -> single Linear
 * layer. For that specific architecture, Grad-CAM's channel weighting
 * (normally "global-average-pool the gradient of the class score w.r.t.
 * each activation channel") is mathematically identical to that Linear
 * layer's own weight row for the target class — this is the classic CAM
 * result (Zhou et al. 2016), and the Grad-CAM paper (Selvaraju et al.
 * 2017, Sec. 3) proves Grad-CAM reduces exactly to CAM for this
 * architecture. So we get an exact result with zero backpropagation,
 * which matters because ONNX Runtime Web's inference API doesn't support
 * autograd.
 */
function computeCAM(
  activationData: Float32Array,
  dims: readonly number[],
  classIdx: number,
): GradCamResult {
  const [, channels, height, width] = dims;
  const spatial = height * width;
  const weightRow = FC_WEIGHTS.weight[classIdx];

  const cam = new Float32Array(spatial);
  for (let c = 0; c < channels; c++) {
    const w = weightRow[c];
    const offset = c * spatial;
    for (let i = 0; i < spatial; i++) {
      cam[i] += w * activationData[offset + i];
    }
  }

  // ReLU
  for (let i = 0; i < spatial; i++) cam[i] = Math.max(cam[i], 0);

  // Min-max normalize to [0, 1]
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < spatial; i++) {
    if (cam[i] < min) min = cam[i];
    if (cam[i] > max) max = cam[i];
  }
  const range = max - min || 1e-8;
  for (let i = 0; i < spatial; i++) cam[i] = (cam[i] - min) / range;

  return { cam, height, width };
}

export interface InferenceResult {
  classification: ClassificationResult;
  gradcam: GradCamResult;
}

function classifyFromLogits(logits: Float32Array, targetClassIdx?: number): ClassificationResult {
  const probabilities = softmax(logits);
  const predictedIndex = targetClassIdx ?? probabilities.indexOf(Math.max(...probabilities));
  return {
    predictedIndex,
    predictedLabel: CLASS_LABELS[predictedIndex],
    confidence: probabilities[predictedIndex],
    probabilities,
  };
}

/**
 * Runs the full pipeline: preprocess -> single forward pass -> softmax
 * classification + exact Grad-CAM, for the predicted class.
 */
export async function classifyWithGradCam(
  source: HTMLImageElement | HTMLCanvasElement,
  targetClassIdx?: number,
): Promise<InferenceResult> {
  const session = await getSession();
  const tensor = await imageToTensor(source);

  const outputs = await session.run({ [session.inputNames[0]]: tensor });

  const logits = outputs[LOGITS_OUTPUT].data as Float32Array;
  const classification = classifyFromLogits(logits, targetClassIdx);

  const activationTensor = outputs[ACTIVATION_OUTPUT];
  const gradcam = computeCAM(
    activationTensor.data as Float32Array,
    activationTensor.dims,
    classification.predictedIndex,
  );

  return { classification, gradcam };
}

export interface StageActivationMap {
  label: string;
  /** Row-major [H, W] values in [0, 1] — mean absolute activation per spatial location, normalized. */
  energy: Float32Array;
  height: number;
  width: number;
}

export interface LayerScrubResult {
  classification: ClassificationResult;
  stages: StageActivationMap[];
}

/**
 * Computes a per-stage "energy map": mean absolute activation across all
 * channels at each spatial location, normalized to [0, 1]. Unlike Grad-CAM,
 * this isn't class-discriminative (it doesn't answer "why this class") —
 * it answers "where is this layer's activity concentrated," which is the
 * right question for a layer-scrubber showing how depth changes what a
 * network responds to. Pure forward-pass math, same as Grad-CAM's approach:
 * no backpropagation involved.
 */
function computeEnergyMap(
  activationData: Float32Array,
  dims: readonly number[],
): { energy: Float32Array; height: number; width: number } {
  const [, channels, height, width] = dims;
  const spatial = height * width;
  const energy = new Float32Array(spatial);

  for (let c = 0; c < channels; c++) {
    const offset = c * spatial;
    for (let i = 0; i < spatial; i++) {
      energy[i] += Math.abs(activationData[offset + i]);
    }
  }
  for (let i = 0; i < spatial; i++) energy[i] /= channels;

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < spatial; i++) {
    if (energy[i] < min) min = energy[i];
    if (energy[i] > max) max = energy[i];
  }
  const range = max - min || 1e-8;
  for (let i = 0; i < spatial; i++) energy[i] = (energy[i] - min) / range;

  return { energy, height, width };
}

/**
 * Runs the full pipeline for the layer-scrubber: one forward pass ->
 * classification (for context) + an energy map at every network depth
 * exposed by the export script (stem, layer1-4).
 */
export async function classifyWithLayerActivations(
  source: HTMLImageElement | HTMLCanvasElement,
): Promise<LayerScrubResult> {
  const session = await getSession();
  const tensor = await imageToTensor(source);

  const outputs = await session.run({ [session.inputNames[0]]: tensor });

  const logits = outputs[LOGITS_OUTPUT].data as Float32Array;
  const classification = classifyFromLogits(logits);

  const stages: StageActivationMap[] = STAGES.map((stage) => {
    const tensorOut = outputs[stage.name];
    const { energy, height, width } = computeEnergyMap(
      tensorOut.data as Float32Array,
      tensorOut.dims,
    );
    return { label: stage.label, energy, height, width };
  });

  return { classification, stages };
}

// Exported for unit testing the math in isolation, without a real session.
export const __internal = { computeCAM, computeEnergyMap, softmax };
