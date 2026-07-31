import * as tf from '@tensorflow/tfjs';
import { featuresForward } from './model';
import type { WeightMap } from './model';

export interface GradCamPlusPlusResult {
  cam: Float32Array; // row-major [height, width], normalized to [0, 1]
  height: number;
  width: number;
}

/**
 * True Grad-CAM++ — needs one real gradient (the target class logit with
 * respect to the last conv block's activation, via `tf.grad`), then the
 * same elementwise weighting formula from Selvaraju et al. applied to it.
 * Unlike standard Grad-CAM, this genuinely can't be reduced to a
 * gradient-free shortcut (see the ONNX-based `inference.ts` for why
 * standard Grad-CAM can, and why Grad-CAM++ is exactly where that trick
 * stops working) — this is the actual reason this TF.js port exists for
 * the Compare tab's "live" mode.
 */
export async function gradCamPlusPlus(
  pixelValues: tf.Tensor4D,
  w: WeightMap,
  classIdx: number,
): Promise<GradCamPlusPlusResult> {
  const activation = tf.tidy(() => featuresForward(pixelValues, w));

  const gradFn = tf.grad((act: tf.Tensor) => {
    const pooled = tf.mean(act as tf.Tensor4D, [1, 2]) as tf.Tensor2D;
    const logits = tf.add(
      tf.matMul(pooled, w['fc_kernel'] as tf.Tensor2D),
      w['fc_bias'] as tf.Tensor1D,
    ) as tf.Tensor2D;
    return tf.slice(logits, [0, classIdx], [1, 1]).asScalar();
  });
  const grad = gradFn(activation);

  const camTensor = tf.tidy(() => {
    const gradSq = tf.square(grad);
    const gradCube = tf.mul(gradSq, grad);
    const sumActGradCube = tf.sum(tf.mul(activation, gradCube), [1, 2], true);
    let denom = tf.add(tf.mul(gradSq, 2), sumActGradCube);
    denom = tf.where(tf.notEqual(denom, 0), denom, tf.onesLike(denom));
    const alpha = tf.div(gradSq, denom);
    const weights = tf.sum(tf.mul(alpha, tf.relu(grad)), [1, 2]); // [1, 512]

    const weightsReshaped = weights.reshape([1, 1, 1, -1]);
    let cam = tf.sum(tf.mul(activation, weightsReshaped), [3]); // [1, H, W]
    cam = tf.relu(cam);

    const camMin = tf.min(cam);
    const camMax = tf.max(cam);
    const range = tf.maximum(tf.sub(camMax, camMin), 1e-8);
    return tf.div(tf.sub(cam, camMin), range);
  });

  const [, height, width] = camTensor.shape;
  const camData = (await camTensor.data()) as Float32Array;

  activation.dispose();
  grad.dispose();
  camTensor.dispose();

  return { cam: camData, height, width };
}
