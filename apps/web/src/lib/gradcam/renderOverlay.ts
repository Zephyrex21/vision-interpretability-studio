import type { GradCamResult } from '../onnx/inference';

// Mirrors --heat-low / --heat-high from styles/tokens.css (dark theme values).
// Kept as plain RGB triples here since canvas pixel manipulation can't read
// CSS custom properties directly.
const HEAT_LOW: [number, number, number] = [42, 36, 112]; // #2a2470
const HEAT_HIGH: [number, number, number] = [255, 180, 84]; // #ffb454

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Bilinear-upsamples the coarse [height, width] CAM grid to [outSize, outSize]
 * and returns a normalized Float32Array of the same length, values in [0, 1].
 * The raw CAM is only 5x5 (ResNet's spatial resolution after layer4), so
 * upsampling quality matters a lot for how convincing the overlay looks.
 */
export function upsampleBilinear(
  cam: Float32Array,
  h: number,
  w: number,
  outSize: number,
): Float32Array {
  const out = new Float32Array(outSize * outSize);
  const scaleY = h / outSize;
  const scaleX = w / outSize;

  for (let y = 0; y < outSize; y++) {
    const srcY = (y + 0.5) * scaleY - 0.5;
    const y0Raw = Math.floor(srcY);
    const ty = Math.min(1, Math.max(0, srcY - y0Raw));
    const y0 = Math.min(h - 1, Math.max(0, y0Raw));
    const y1 = Math.min(h - 1, Math.max(0, y0Raw + 1));

    for (let x = 0; x < outSize; x++) {
      const srcX = (x + 0.5) * scaleX - 0.5;
      const x0Raw = Math.floor(srcX);
      const tx = Math.min(1, Math.max(0, srcX - x0Raw));
      const x0 = Math.min(w - 1, Math.max(0, x0Raw));
      const x1 = Math.min(w - 1, Math.max(0, x0Raw + 1));

      const v00 = cam[y0 * w + x0];
      const v01 = cam[y0 * w + x1];
      const v10 = cam[y1 * w + x0];
      const v11 = cam[y1 * w + x1];

      const top = lerp(v00, v01, tx);
      const bottom = lerp(v10, v11, tx);
      out[y * outSize + x] = lerp(top, bottom, ty);
    }
  }
  return out;
}

/**
 * Renders `source` (the original image) onto `canvas` with the Grad-CAM
 * heatmap blended on top, using the studio's violet-to-amber scale.
 */
export function renderGradCamOverlay(
  canvas: HTMLCanvasElement,
  source: HTMLImageElement | HTMLCanvasElement,
  gradcam: GradCamResult,
  opts: { size?: number; alpha?: number } = {},
): void {
  const size = opts.size ?? 320;
  const alpha = opts.alpha ?? 0.5;

  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire 2D canvas context');

  const srcWidth = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const srcHeight = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const cropSize = Math.min(srcWidth, srcHeight);
  const cropX = (srcWidth - cropSize) / 2;
  const cropY = (srcHeight - cropSize) / 2;

  ctx.drawImage(source, cropX, cropY, cropSize, cropSize, 0, 0, size, size);

  const baseImageData = ctx.getImageData(0, 0, size, size);
  const upsampled = upsampleBilinear(gradcam.cam, gradcam.height, gradcam.width, size);

  const pixels = baseImageData.data;
  for (let i = 0; i < size * size; i++) {
    const heat = upsampled[i];
    const r = lerp(HEAT_LOW[0], HEAT_HIGH[0], heat);
    const g = lerp(HEAT_LOW[1], HEAT_HIGH[1], heat);
    const b = lerp(HEAT_LOW[2], HEAT_HIGH[2], heat);
    const blend = alpha * heat;

    const idx = i * 4;
    pixels[idx] = lerp(pixels[idx], r, blend);
    pixels[idx + 1] = lerp(pixels[idx + 1], g, blend);
    pixels[idx + 2] = lerp(pixels[idx + 2], b, blend);
  }

  ctx.putImageData(baseImageData, 0, 0);
}
