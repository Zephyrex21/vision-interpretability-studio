import * as ort from 'onnxruntime-web/wasm';

/**
 * Runtime configuration for ONNX Runtime Web.
 *
 * We deliberately force single-threaded WASM execution rather than the
 * threaded build: threaded WASM requires SharedArrayBuffer, which in turn
 * requires the page to be served with COOP/COEP cross-origin-isolation
 * headers. Plain static hosts (Vercel/Netlify free tier, as used by this
 * project) don't set those by default, and asking users to configure
 * custom headers just to view a portfolio piece is a bad trade for the
 * performance gain. Single-threaded WASM is slower per-inference but works
 * everywhere with zero configuration — the right choice for this project.
 *
 * Note: we intentionally do NOT set `ort.env.wasm.wasmPaths` here. Vite
 * statically detects onnxruntime-web's internal WASM asset reference and
 * bundles it automatically (as a hashed file under `dist/assets/`); adding
 * a manual copy under `public/` as well would ship the same ~13MB file
 * twice. Let Vite own this asset.
 */
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;

const MODEL_URL = '/models/model_gradcam.onnx';

let sessionPromise: Promise<ort.InferenceSession> | null = null;

/** Lazily creates (and caches) the ONNX Runtime Web inference session. */
export function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
  }
  return sessionPromise;
}

export { ort };
