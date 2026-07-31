import * as tf from '@tensorflow/tfjs';
import { getWeights, fullForward } from './model';
import { fgsmAttack } from './fgsm';
import { gradCamPlusPlus } from './gradcamPlusPlus';
import type { GradCamPlusPlusResult } from './gradcamPlusPlus';
import { imageToTensorNHWC } from './preprocess';
import classLabelsData from '../../data/classLabels.json';

export const CLASS_LABELS: string[] = classLabelsData;

function softmax(logits: Float32Array): number[] {
  const arr = Array.from(logits);
  const max = Math.max(...arr);
  const exps = arr.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export interface TfjsClassification {
  predictedIndex: number;
  predictedLabel: string;
  confidence: number;
}

async function classifyTensor(
  pixelValues: tf.Tensor4D,
  w: Awaited<ReturnType<typeof getWeights>>,
): Promise<TfjsClassification> {
  const logits = fullForward(pixelValues, w);
  const logitsData = (await logits.data()) as Float32Array;
  logits.dispose();

  const probabilities = softmax(logitsData);
  const predictedIndex = probabilities.indexOf(Math.max(...probabilities));
  return {
    predictedIndex,
    predictedLabel: CLASS_LABELS[predictedIndex],
    confidence: probabilities[predictedIndex],
  };
}

export interface LiveAdversarialResult {
  clean: TfjsClassification;
  adversarial: TfjsClassification;
  cleanCanvas: HTMLCanvasElement;
  adversarialCanvas: HTMLCanvasElement;
  epsilon: number;
}

/** Renders a [1,H,W,3] float tensor in [0,1] onto a fresh canvas. */
async function tensorToCanvas(pixelValues: tf.Tensor4D): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const [, height, width] = pixelValues.shape;
  canvas.width = width;
  canvas.height = height;
  const squeezed = tf.tidy(() => pixelValues.squeeze([0]) as tf.Tensor3D);
  await tf.browser.toPixels(squeezed, canvas);
  squeezed.dispose();
  return canvas;
}

/**
 * Full live-FGSM pipeline for an arbitrary uploaded image: classify it,
 * attack it against its own (current) prediction, classify the result.
 * Everything here runs a genuine gradient computation — there is no
 * precomputed data involved, unlike the Adversarial tab's sample gallery.
 */
export async function runLiveFgsm(
  source: HTMLImageElement,
  epsilon: number,
): Promise<LiveAdversarialResult> {
  const w = await getWeights();
  const pixelValues = imageToTensorNHWC(source);

  const clean = await classifyTensor(pixelValues, w);
  const adversarialTensor = fgsmAttack(pixelValues, w, clean.predictedIndex, epsilon);
  const adversarial = await classifyTensor(adversarialTensor, w);

  const cleanCanvas = await tensorToCanvas(pixelValues);
  const adversarialCanvas = await tensorToCanvas(adversarialTensor);

  pixelValues.dispose();
  adversarialTensor.dispose();

  return { clean, adversarial, cleanCanvas, adversarialCanvas, epsilon };
}

export interface LiveGradCamPlusPlusResult {
  classification: TfjsClassification;
  gradcam: GradCamPlusPlusResult;
}

/** Full live-Grad-CAM++ pipeline for an arbitrary uploaded image. */
export async function runLiveGradCamPlusPlus(
  source: HTMLImageElement,
): Promise<LiveGradCamPlusPlusResult> {
  const w = await getWeights();
  const pixelValues = imageToTensorNHWC(source);

  const classification = await classifyTensor(pixelValues, w);
  const gradcam = await gradCamPlusPlus(pixelValues, w, classification.predictedIndex);

  pixelValues.dispose();

  return { classification, gradcam };
}
