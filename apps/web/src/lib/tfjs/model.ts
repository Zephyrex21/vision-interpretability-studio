import * as tf from '@tensorflow/tfjs';

/**
 * A from-scratch TensorFlow.js port of the same ResNet-18 that powers the
 * ONNX Runtime Web pipeline elsewhere in this app. It exists for exactly
 * one reason: ONNX Runtime is inference-only and can't backpropagate, so
 * true per-upload FGSM and Grad-CAM++ (which both need real gradients)
 * aren't possible on that engine. This model is numerically verified
 * against the ONNX model — max logit difference 0.000006 across sample
 * images, tighter than the original PyTorch↔ONNX export's own parity
 * check — before being trusted for anything gradient-based.
 *
 * Weights are extracted directly from the trained ONNX graph via
 * `ml/src/extract_weights_for_tfjs.py`, with conv kernels transposed from
 * PyTorch/ONNX's [out,in,kH,kW] layout to TensorFlow's [kH,kW,in,out].
 * BatchNorm was fused into the preceding Conv during the original PyTorch
 * export (confirmed by inspecting the ONNX graph — no BatchNormalization
 * nodes exist), so this port only needs Conv+bias, ReLU, and residual Add.
 *
 * Padding is passed as explicit numeric values (not 'same'/'valid') to
 * exactly match ONNX's symmetric zero-padding — this is the detail most
 * likely to silently produce a model that runs but gives wrong answers.
 */

const WEIGHTS_URL = '/models/tfjs/weights.bin';
const MANIFEST_URL = '/models/tfjs/manifest.json';

interface ManifestEntry {
  name: string;
  shape: number[];
  byteOffset: number;
  byteLength: number;
}

export type WeightMap = Record<string, tf.Tensor>;

let weightsPromise: Promise<WeightMap> | null = null;
let weightsReady = false;

export function isTfjsReady(): boolean {
  return weightsReady;
}

/** Lazily fetches and caches the TF.js weight tensors (~43MB, one-time). */
export function getWeights(): Promise<WeightMap> {
  if (!weightsPromise) {
    weightsPromise = loadWeights().then((w) => {
      weightsReady = true;
      return w;
    });
  }
  return weightsPromise;
}

async function loadWeights(): Promise<WeightMap> {
  const [manifestRes, binRes] = await Promise.all([fetch(MANIFEST_URL), fetch(WEIGHTS_URL)]);
  const manifest: ManifestEntry[] = await manifestRes.json();
  const buffer = await binRes.arrayBuffer();

  const weights: WeightMap = {};
  for (const entry of manifest) {
    const slice = buffer.slice(entry.byteOffset, entry.byteOffset + entry.byteLength);
    const floatArray = new Float32Array(slice);
    weights[entry.name] = tf.tensor(Array.from(floatArray), entry.shape, 'float32');
  }
  return weights;
}

function convBiasReLU(
  x: tf.Tensor4D,
  w: WeightMap,
  idx: number,
  stride: number,
  pad: number,
  applyRelu = true,
): tf.Tensor4D {
  const kernel = w[`conv${idx}_kernel`] as tf.Tensor4D;
  const bias = w[`conv${idx}_bias`] as tf.Tensor1D;
  let out = tf.conv2d(x, kernel, stride, pad) as tf.Tensor4D;
  out = tf.add(out, bias) as tf.Tensor4D;
  return applyRelu ? (tf.relu(out) as tf.Tensor4D) : out;
}

function basicBlock(
  x: tf.Tensor4D,
  w: WeightMap,
  idx1: number,
  idx2: number,
  stride: number,
  downsampleIdx: number | null = null,
): tf.Tensor4D {
  const identity = downsampleIdx !== null ? convBiasReLU(x, w, downsampleIdx, stride, 0, false) : x;
  let out = convBiasReLU(x, w, idx1, stride, 1, true);
  out = convBiasReLU(out, w, idx2, 1, 1, false);
  return tf.relu(tf.add(out, identity)) as tf.Tensor4D;
}

/**
 * Runs the network up to the final residual block's activation (pre-GAP),
 * matching layer4's output in the ONNX/Grad-CAM pipeline elsewhere in this
 * app. Split out from the classifier head because Grad-CAM++ needs
 * gradients with respect to this specific intermediate tensor.
 */
export function featuresForward(pixelValues: tf.Tensor4D, w: WeightMap): tf.Tensor4D {
  const mean = (w['input_mean'] as tf.Tensor1D).reshape([1, 1, 1, 3]);
  const std = (w['input_std'] as tf.Tensor1D).reshape([1, 1, 1, 3]);
  let x = tf.div(tf.sub(pixelValues, mean), std) as tf.Tensor4D;

  // Stem: 7x7 stride2 pad3 conv -> relu -> 3x3 stride2 pad1 maxpool
  x = convBiasReLU(x, w, 0, 2, 3, true);
  x = tf.maxPool(x, 3, 2, 1) as tf.Tensor4D;

  x = basicBlock(x, w, 1, 2, 1, null); // layer1
  x = basicBlock(x, w, 3, 4, 1, null);

  x = basicBlock(x, w, 5, 6, 2, 7); // layer2
  x = basicBlock(x, w, 8, 9, 1, null);

  x = basicBlock(x, w, 10, 11, 2, 12); // layer3
  x = basicBlock(x, w, 13, 14, 1, null);

  x = basicBlock(x, w, 15, 16, 2, 17); // layer4
  x = basicBlock(x, w, 18, 19, 1, null);

  return x; // [1, 5, 5, 512]
}

/** GlobalAveragePool + FC — the classifier head, applied on top of featuresForward's output. */
export function headForward(activation: tf.Tensor4D, w: WeightMap): tf.Tensor2D {
  const pooled = tf.mean(activation, [1, 2]) as tf.Tensor2D; // [1, 512]
  return tf.add(
    tf.matMul(pooled, w['fc_kernel'] as tf.Tensor2D),
    w['fc_bias'] as tf.Tensor1D,
  ) as tf.Tensor2D;
}

export function fullForward(pixelValues: tf.Tensor4D, w: WeightMap): tf.Tensor2D {
  return headForward(featuresForward(pixelValues, w), w);
}

export { tf };
