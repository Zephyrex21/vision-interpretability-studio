import * as tf from '@tensorflow/tfjs';
import { fullForward } from './model';
import type { WeightMap } from './model';

const NUM_CLASSES = 10;

/**
 * Fast Gradient Sign Method — a real gradient of the loss with respect to
 * every input pixel, computed via `tf.grad`, not an approximation. This is
 * the thing plain ONNX Runtime Web genuinely cannot do (no backprop), and
 * the whole reason this TF.js port exists.
 *
 * `pixelValues`: [1, H, W, 3] in [0, 1]. `trueLabelIdx`: the class index to
 * treat as ground truth for the loss (usually the model's own current
 * prediction, since a real photo has no ground-truth label to attack
 * against). Returns the perturbed image, still clamped to [0, 1].
 */
export function fgsmAttack(
  pixelValues: tf.Tensor4D,
  w: WeightMap,
  targetLabelIdx: number,
  epsilon: number,
): tf.Tensor4D {
  const lossFn = (x: tf.Tensor) => {
    const logits = fullForward(x as tf.Tensor4D, w);
    const oneHot = tf.oneHot([targetLabelIdx], NUM_CLASSES);
    return tf.losses.softmaxCrossEntropy(oneHot, logits).asScalar();
  };

  const gradFn = tf.grad(lossFn);
  const grad = gradFn(pixelValues);
  const perturbation = tf.mul(tf.sign(grad), epsilon);
  const adversarial = tf.clipByValue(tf.add(pixelValues, perturbation), 0, 1) as tf.Tensor4D;

  grad.dispose();
  perturbation.dispose();

  return adversarial;
}
