import { ort } from './session';

export const MODEL_IMG_SIZE = 160;

/**
 * Draws an image source onto an offscreen canvas at the model's expected
 * size (center-cropped to square, matching the notebook's eval transform:
 * resize-then-center-crop), then reads back raw RGBA pixels and converts
 * them to a [1, 3, H, W] float32 tensor in [0, 1].
 *
 * Normalization is intentionally NOT applied here — it's baked into the
 * model itself (see the notebook's `NormalizedResNet`), so this function's
 * only job is "raw pixels in, correctly shaped tensor out."
 */
export async function imageToTensor(
  source: HTMLImageElement | HTMLCanvasElement,
  size: number = MODEL_IMG_SIZE,
): Promise<ort.Tensor> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire 2D canvas context for preprocessing');

  const srcWidth = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const srcHeight = 'naturalHeight' in source ? source.naturalHeight : source.height;

  // Center-crop to a square in source space, then draw scaled to `size`.
  const cropSize = Math.min(srcWidth, srcHeight);
  const cropX = (srcWidth - cropSize) / 2;
  const cropY = (srcHeight - cropSize) / 2;

  ctx.drawImage(source, cropX, cropY, cropSize, cropSize, 0, 0, size, size);

  const { data } = ctx.getImageData(0, 0, size, size); // RGBA, uint8, HWC
  const chw = new Float32Array(3 * size * size);
  const plane = size * size;

  for (let i = 0; i < plane; i++) {
    chw[i] = data[i * 4] / 255; // R
    chw[plane + i] = data[i * 4 + 1] / 255; // G
    chw[2 * plane + i] = data[i * 4 + 2] / 255; // B
  }

  return new ort.Tensor('float32', chw, [1, 3, size, size]);
}

/** Loads an <img> element from a URL and resolves once it's decoded. */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}
