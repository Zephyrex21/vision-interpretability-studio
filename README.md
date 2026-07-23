# Vision Interpretability Studio

An interactive, zero-cost, in-browser tool for seeing inside a vision model —
live Grad-CAM and a browsable feature-visualization gallery today, with
adversarial perturbation and Grad-CAM++ comparisons coming next. Inference
runs entirely client-side via ONNX Runtime Web; there is no backend and no
paid service anywhere in the stack.

> **Status: Phase 2 — Inference Engine, done.** The workbench is live: pick
> a sample or upload any image and get a real prediction plus an exact
> Grad-CAM heatmap, computed by your trained ResNet-18 running in the
> browser. The Features tab browses the precomputed filter-visualization
> gallery. Adversarial and Compare are next (see "What's next" below for why
> they aren't live yet).

---

## Repo layout

```
vision-interpretability-studio/
├── apps/
│   └── web/                        # React + Vite + TypeScript frontend
│       ├── public/
│       │   ├── models/             # model_gradcam.onnx, feature_viz/ images (fetched at runtime)
│       │   └── samples/            # 10 demo images from the Kaggle validation set
│       └── src/
│           ├── components/
│           │   ├── workbench/       # layout shell, tab navigation
│           │   ├── visualizations/  # GradCamView, FeatureVizView (live); adversarial/compare (soon)
│           │   └── ui/              # shared primitives (ThemeToggle, etc.)
│           ├── lib/
│           │   ├── onnx/            # session setup, preprocessing, classify + exact Grad-CAM
│           │   └── gradcam/         # canvas heatmap rendering (bilinear upsample + color scale)
│           ├── data/                # bundled JSON: class labels, FC weights, sample/feature-viz metadata
│           ├── state/                # ThemeContext, WorkbenchContext
│           ├── styles/               # design tokens (tokens.css), global.css
│           └── test/                 # Vitest setup
├── ml/
│   ├── notebooks/
│   │   └── vision_interpretability_phase1.ipynb   # Kaggle training notebook
│   ├── src/                  # gradcam.py, feature_viz.py, fgsm.py, export_onnx.py,
│   │                          # prepare_gradcam_export.py, test_math.py
│   ├── requirements.txt
│   └── README.md
├── .github/workflows/ci.yml  # lint, typecheck, test, build on every push/PR
└── README.md                 # you are here
```

## The technical decision behind Grad-CAM

Plain ONNX Runtime — including ONNX Runtime Web, which runs this app's
inference — is **inference-only**. It has no backpropagation, so "live
Grad-CAM in the browser" isn't something you get for free.

This model's architecture ends in Global-Average-Pool → a single Linear
layer. For exactly that architecture, Grad-CAM's gradient-based channel
weighting is **mathematically identical** to that Linear layer's own weight
row for the target class — the classic CAM result (Zhou et al., 2016), and
the Grad-CAM paper itself (Selvaraju et al., 2017, Sec. 3) proves Grad-CAM
reduces exactly to CAM for this architecture. So the app computes a real,
exact Grad-CAM with zero backpropagation:

1. `ml/src/prepare_gradcam_export.py` performs graph surgery on the trained
   ONNX model to expose the last conv block's activation map as a second
   output, and extracts the classifier head's weights to `fc_weights.json`.
2. One forward pass in the browser returns both the prediction logits and
   the activation map.
3. `apps/web/src/lib/onnx/inference.ts` computes
   `ReLU(sum_c weight[class, c] * activation_c)` as plain JS array math,
   then `apps/web/src/lib/gradcam/renderOverlay.ts` bilinear-upsamples and
   colors it using the studio's design tokens.

This is why Grad-CAM works live for *any* image, upload or sample, with no
server round-trip.

## Installation

Requires **Node.js 20+** and npm.

```bash
cd vision-interpretability-studio/apps/web
npm install
```

## Running it locally

```bash
npm run dev
```

Open the printed local URL. The Grad-CAM tab loads a sample image and runs
real inference automatically — you should see a prediction with a confidence
percentage and a heatmap overlay within a couple of seconds (first load
downloads the ~43MB model + ~13MB WASM runtime; both are cached by the
browser afterward). Try uploading your own photo, or use "see attention for
a different class" to view a counterfactual heatmap.

## Testing steps

All commands below are run from `apps/web/`.

| Command | What it checks |
|---|---|
| `npm run format:check` | Prettier formatting is consistent |
| `npm run lint` | oxlint — 0 errors expected (`public/` vendored assets are excluded) |
| `npx tsc -b` | TypeScript typecheck across the project |
| `npm run test` | Vitest — math + component tests |
| `npm run build` | Production build via `tsc -b && vite build` |
| `npm run preview` | Serves the production build locally |

```bash
npm run format:check
npm run lint
npx tsc -b
npm run test
npm run build
```

> **Windows PowerShell note:** the classic `&&` chaining above only works in
> bash/cmd or PowerShell 7+. In Windows PowerShell 5.1 (the version that
> ships by default on Windows), run each command on its own line instead, or
> join them with `;` — e.g. `npm run lint; npx tsc -b; npm run test`. Both
> approaches run the same checks; `;` just doesn't stop on the first failure
> the way `&&` does.

Expected result: all steps exit `0`. The test suite covers three areas —
**15 tests total**:

- `WorkbenchShell.test.tsx` (5) — all four tabs render, "soon" badges show on
  the not-yet-live tabs, clicking a tab switches its content
- `lib/onnx/inference.test.ts` (6) — softmax is numerically stable and sums
  to 1; the Grad-CAM math stays normalized to `[0, 1]`, never produces NaN,
  and safely handles all-zero activations without dividing by zero
- `lib/gradcam/renderOverlay.test.ts` (4) — bilinear upsampling produces the
  right output size, preserves uniform fields exactly, never overshoots the
  input range, and interpolates smoothly rather than blocking

These are pure-logic tests and don't require a real model or GPU — they run
in milliseconds. I additionally verified the actual trained model against
real inference (Node.js via `onnxruntime-web`'s WASM backend, 10/10 sample
predictions correct) and in a real headless browser via Playwright (full
page load → model download → live inference → heatmap render, zero console
errors) before shipping this phase — see the conversation history for those
runs if you want the details.

### Continuous Integration

`.github/workflows/ci.yml` runs the frontend checks on Node 20 and the `ml/`
math tests (numpy-only, no GPU) on Python 3.11, on every push and PR to
`main`.

---

## Phases so far

- **Phase 0 — Foundation & Planning:** repo scaffold, design tokens,
  workbench shell, shared state architecture.
- **Phase 1 — Model & Interpretability Core:** `ml/notebooks/vision_interpretability_phase1.ipynb`
  trains a ResNet-18 from scratch on Imagenette (88.2% val accuracy),
  implements Grad-CAM/Grad-CAM++/feature-viz/FGSM in PyTorch, and exports to
  ONNX with a verified parity check. Runs on Kaggle's free GPU tier.
- **Phase 2 — Inference Engine (this phase):** ONNX Runtime Web wired into
  the workbench; live classifier + exact Grad-CAM for any image; Features
  tab browsing the precomputed filter gallery.

## What's next

**Adversarial (FGSM) and Compare/Grad-CAM++** both genuinely need gradients
w.r.t. the input or higher-order gradient terms that don't reduce to a
closed form the way standard Grad-CAM does — plain ONNX Runtime Web can't
compute either. Rather than fake them, their tabs are marked "soon" in the
UI. The honest path forward is one of:

1. Ship the FGSM/Grad-CAM++ results already generated in the Phase 1
   notebook as a precomputed comparison gallery (fast — just needs 2 more
   files exported from Kaggle), interactive only for the 10 bundled sample
   images rather than arbitrary uploads.
2. A proper backprop-capable in-browser runtime (e.g. re-hosting the
   trained weights in TensorFlow.js, which does support autograd) for true
   per-upload interactivity — a bigger lift, tracked as a stretch goal.
