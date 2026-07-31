import * as tf from '@tensorflow/tfjs';

export const TFJS_IMG_SIZE = 160;

/**
 * Mirrors `lib/onnx/preprocess.ts`'s center-crop-then-resize logic, but
 * produces an NHWC tensor ([1, H, W, 3]) rather than ONNX's NCHW — the two
 * pipelines intentionally stay separate rather than sharing a converter,
 * since NHWC is what tf.js's conv ops expect natively and a shared
 * abstraction would just add an unnecessary transpose on every frame.
 */
export function imageToTensorNHWC(
  source: HTMLImageElement | HTMLCanvasElement,
  size: number = TFJS_IMG_SIZE,
): tf.Tensor4D {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire 2D canvas context for preprocessing');

  const srcWidth = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const srcHeight = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const cropSize = Math.min(srcWidth, srcHeight);
  const cropX = (srcWidth - cropSize) / 2;
  const cropY = (srcHeight - cropSize) / 2;

  ctx.drawImage(source, cropX, cropY, cropSize, cropSize, 0, 0, size, size);

  return tf.tidy(() => {
    const pixels = tf.browser.fromPixels(canvas, 3); // [H, W, 3] uint8
    const floatPixels = pixels.toFloat().div(255); // [0, 1]
    return floatPixels.expandDims(0) as tf.Tensor4D; // [1, H, W, 3]
  });
}
