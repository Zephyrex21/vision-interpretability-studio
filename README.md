# Vision Interpretability Studio

An interactive, zero-cost, in-browser tool for seeing inside a vision model
— live Grad-CAM, a network-depth layer scrubber, a feature-visualization
gallery, and adversarial-robustness comparisons, all running entirely
client-side via ONNX Runtime Web. No backend, no paid service anywhere in
the stack.

> **Status: all five blueprint phases done, plus polish.** All five tabs
> are live: Grad-CAM (live, exact, any image), **Layers** (scrub through
> network depth — stem → layer1 → layer2 → layer3 → layer4 — and watch a
> real image's activation energy shift from edges to whole-object concepts,
> computed fresh in the browser), Features (browsable filter gallery),
> Adversarial (precomputed FGSM comparison gallery), and Compare (live
> Grad-CAM next to precomputed Grad-CAM++). Deployed, mobile-tested,
> claymorphism redesign, first-visit onboarding tour. See
> [`CASE_STUDY.md`](./CASE_STUDY.md) for the full write-up — the
> inference-only ONNX constraint, the CAM-equivalence trick that made exact
> live Grad-CAM possible anyway, and the most interesting things the model
> actually did.

## Design

A claymorphism system: every surface is molded from the same material as
its background, distinguished by a light-side highlight + dark-side shadow
pair rather than a hard border. The signature interaction ties the material
to its function — an inactive tab or thumbnail sits raised off the surface
(outset shadow), and selecting it presses it in (inset shadow), used
consistently for every genuinely toggleable control (tabs, sample
thumbnails, the layer-scrubber, class-override pills) rather than an
arbitrary color swap. Type pairs **Fraunces** (a soft-edged serif, used
sparingly for headings) with **Inter** for body copy, echoing the UI's
rounded forms without tipping into a playful register. See
`src/styles/tokens.css` for the full token system and the reasoning behind
each shadow pair.

---

## Repo layout

```
vision-interpretability-studio/
├── apps/
│   └── web/                        # React + Vite + TypeScript frontend
│       ├── public/
│       │   ├── models/             # model_gradcam.onnx, feature_viz/ images (fetched at runtime)
│       │   └── samples/            # 10 demo images from the Kaggle validation set
│       ├── src/
│       │   ├── components/
│       │   │   ├── workbench/       # layout shell, tab navigation
│       │   │   ├── visualizations/  # GradCamView, LayersView, FeatureVizView,
│       │   │   │                    # AdversarialView, CompareView
│       │   │   └── ui/              # shared primitives (ThemeToggle, etc.)
│       │   ├── lib/
│       │   │   ├── onnx/            # session setup, preprocessing, classify + exact Grad-CAM
│       │   │   └── gradcam/         # canvas heatmap rendering (bilinear upsample + color scale)
│       │   ├── data/                # bundled JSON: class labels, FC weights, sample/feature-viz/
│       │   │                        # adversarial/Grad-CAM++ metadata
│       │   ├── state/                # context objects, providers, and hooks (theme + workbench)
│       │   ├── styles/               # design tokens (tokens.css), global.css
│       │   └── test/                 # Vitest setup
│       ├── e2e/                      # Playwright specs — real browser, real model/weight files
│       └── playwright.config.ts
├── ml/
│   ├── notebooks/
│   │   └── vision_interpretability_phase1.ipynb   # Kaggle training notebook
│   ├── src/                  # gradcam.py, feature_viz.py, fgsm.py, export_onnx.py,
│   │                          # prepare_gradcam_export.py, test_math.py
│   ├── requirements.txt
│   └── README.md
├── .github/workflows/ci.yml  # lint, typecheck, unit tests, e2e tests, build — every push/PR
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

This is why Grad-CAM works live for _any_ image, upload or sample, with no
server round-trip.

## The Layer Scrubber

Like Grad-CAM, the layer-scrubber (`LayersView`) needed no backpropagation
— `ml/src/prepare_gradcam_export.py` exposes five stages of the network as
extra graph outputs (the stem, and the final activation of each of the four
residual layer groups), confirmed via `onnx.shape_inference` against the
real model: 40×40 → 40×40 → 20×20 → 10×10 → 5×5 spatially, 64 → 64 → 128 →
256 → 512 channels — textbook ResNet-18. One forward pass returns all five
activation maps at once. For each stage, `computeEnergyMap()` in
`inference.ts` takes the mean _absolute_ activation across channels at each
spatial location (not signed, not class-weighted — this is deliberately a
different question from Grad-CAM: "where is this layer active" rather than
"why this class"), normalizes to `[0, 1]`, and renders through the same
`renderGradCamOverlay()` used everywhere else.

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

| Command                | What it checks                                                      |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run format:check` | Prettier formatting is consistent                                   |
| `npm run lint`         | oxlint — 0 errors expected (`public/` vendored assets are excluded) |
| `npx tsc -b`           | TypeScript typecheck across the project                             |
| `npm run test`         | Vitest — math + component tests                                     |
| `npm run build`        | Production build via `tsc -b && vite build`                         |
| `npm run preview`      | Serves the production build locally                                 |

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

Expected result: all steps exit `0`. The test suite covers six areas —
**41 tests total**:

- `WorkbenchShell.test.tsx` (8) — all five tabs render, no "soon" badges
  remain, clicking a tab switches its content, the Layers, Adversarial, and
  Compare tabs render their real intro copy, and the header help button
  reopens the onboarding tour even for a returning visitor
- `OnboardingTour.test.tsx` (7) — a controlled component (open/onDismiss
  props, no internal state) that renders correctly for both `open` values,
  lists all five tabs, and calls `onDismiss` for the button, Escape key,
  and a backdrop click
- `useOnboardingTour.test.ts` (5) — the hook backing the tour: opens on a
  first visit, stays closed if already dismissed, and `openTour()`
  correctly reopens it even after a prior dismissal
- `InfoTip.test.tsx` (6) — the jargon-glossary popover: hidden initially,
  opens on click, closes on a second click, closes on outside click, closes
  on Escape, and exposes correct `aria-expanded` state
- `lib/onnx/inference.test.ts` (11) — softmax is numerically stable and sums
  to 1; the Grad-CAM math stays normalized to `[0, 1]`, never produces NaN,
  and safely handles all-zero activations; the layer-scrubber's energy-map
  math is shape-correct, magnitude-based (not sign-based, unlike Grad-CAM),
  correctly ranks high-activity locations above near-zero ones, and never
  divides by zero
- `lib/gradcam/renderOverlay.test.ts` (4) — bilinear upsampling produces the
  right output size, preserves uniform fields exactly, never overshoots the
  input range, and interpolates smoothly rather than blocking

These are pure-logic tests and don't require a real model or GPU — they run
in milliseconds. I additionally verified the actual trained model against
real inference (Node.js via `onnxruntime-web`'s WASM backend, 10/10 sample
predictions correct).

### End-to-end tests (Playwright)

The browser-level checks previously done ad hoc — full page load → model
download → live inference → heatmap render; the touch-drag adversarial
slider; the lazy TF.js engine boundary; the download-vs-cached loading
messages — are now a committed, runnable suite in `apps/web/e2e/`, not just
a claim in this README. Run it with:

```bash
npx playwright install --with-deps chromium   # one-time, downloads a real browser
npm run test:e2e
```

| Spec                        | What it checks                                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gradcam-flow.spec.ts`      | Real page load, real model download, real inference, a heatmap with actual non-blank pixel content, zero console errors; switching sample images reuses the cached session instead of re-downloading          |
| `adversarial-touch.spec.ts` | Synthetic `pointerType: 'touch'` events against the reveal slider (run on a mobile-emulated project) — regression-tests the pointer-events/stale-closure fix directly, plus a 44px minimum touch-target check |
| `tfjs-lazy-load.spec.ts`    | Opening the Adversarial tab and browsing the precomputed gallery fires zero requests for the ~43MB TF.js weight file; uploading a photo to the live playground does                                           |
| `loading-messages.spec.ts`  | The one-time "downloading the model" message never reappears once the ONNX session is cached, even after switching tabs                                                                                       |

These talk to the real model/weight files (served locally by `vite
preview`, no external network needed beyond the one-time browser binary
install), so expect them to take noticeably longer than the Vitest suite —
they're not meant to run on every keystroke. `.github/workflows/ci.yml`
runs them as a separate `e2e` job on every push/PR, uploading the
Playwright HTML report as a build artifact on failure.

### Continuous Integration

`.github/workflows/ci.yml` runs three jobs on every push and PR to `main`:
the frontend checks (format, lint, typecheck, Vitest, build) and a separate
`e2e` job (installs a real Chromium via Playwright, runs the suite above
against a local preview build) on Node 20, and the `ml/` math tests
(numpy-only, no GPU) on Python 3.11.

---

## Performance

Tab content is code-split via `React.lazy` + `Suspense` — each of the five
visualization views (`GradCamView`, `LayersView`, `FeatureVizView`,
`AdversarialView`, `CompareView`) is its own JS chunk, and the shared
`onnxruntime-web` + inference code (~175KB) only downloads if you actually
open a tab that runs model inference (Grad-CAM, Layers, or Compare). A
visitor who only browses Features/Adversarial never pays for the ONNX
runtime at all. The main shell chunk dropped from 513KB to 319KB as a
result. The 13MB WASM binary itself is fetched separately by
`onnxruntime-web` only at the moment a model session is actually created —
it was never part of the JS bundle to begin with.

## Phases so far

- **Phase 0 — Foundation & Planning:** repo scaffold, design tokens,
  workbench shell, shared state architecture.
- **Phase 1 — Model & Interpretability Core:** `ml/notebooks/vision_interpretability_phase1.ipynb`
  trains a ResNet-18 from scratch on Imagenette (88.2% val accuracy),
  implements Grad-CAM/Grad-CAM++/feature-viz/FGSM in PyTorch, and exports to
  ONNX with a verified parity check. Runs on Kaggle's free GPU tier.
- **Phase 2 — Inference Engine:** ONNX Runtime Web wired into the
  workbench; live classifier + exact Grad-CAM for any image; Features tab
  browsing the precomputed filter gallery.
- **Phase 2.5 — Adversarial & Compare:** `ml/src/prepare_gradcam_export.py`'s
  sibling notebook cells (section 10) export per-sample Grad-CAM++ overlays
  and FGSM adversarial triples for the 10 bundled images — genuine results
  requiring real backpropagation, computed once on Kaggle and shipped as a
  static comparison gallery. The Adversarial tab shows a clean/adversarial
  slider per image (4/10 predictions flip at ε=0.03, several with 90%+
  confidence in the wrong class); the Compare tab runs live Grad-CAM in the
  browser right next to the precomputed Grad-CAM++ result for the same
  image, so you can see the two methods agree.
- **Performance pass:** code-split the five visualization tabs so the ONNX
  runtime only loads for tabs that need it. Main chunk 513KB → 319KB.
- **Deployed to Vercel** — live, tested against a real production build.
- **Phase 3.5 — Layer Scrubber:** the one real gap from the original
  blueprint's Phase 3 — a live, per-image scrubber through network depth
  (stem → layer1 → layer2 → layer3 → layer4), not the static filter gallery
  Features already covers. Same forward-only-math philosophy as Grad-CAM:
  no backpropagation, just activation magnitudes exposed via graph surgery
  and verified against the real model before any UI was built.
- **Responsive / mobile pass:** found and fixed a real functional bug, not
  just a sizing one — the Adversarial tab's reveal slider only listened for
  `onMouseMove`, which never fires on touchscreens; on an actual phone it
  would sit frozen. Rewrote it with the Pointer Events API (unifies mouse,
  touch, and pen), which surfaced a second bug — a stale-closure race
  between `pointerdown` and `pointermove` — caught via a Playwright test
  that dispatches synthetic `pointerType: touch` events and asserts the
  slider actually moves, not just that the page renders. Fixed with a ref
  instead of state for the drag-gate. Also added `@media (hover: none) and
(pointer: coarse)` touch-target sizing (44px minimum, the WCAG/Apple/
  Google standard) across all interactive controls — verified with real
  device-emulated measurements before and after, not assumed.
- **Claymorphism redesign:** every surface rebuilt around a real physical
  metaphor — controls with genuine on/off state (tabs, sample thumbnails,
  the layer-scrubber) look physically pressed in when active rather than
  just color-swapped. Verified with computed-style assertions (active tabs
  genuinely carry an `inset` box-shadow) and pixel-sampled screenshots
  confirming exact color-token matches across all 5 tabs and both themes —
  and re-ran the touch-drag regression test from the mobile pass to confirm
  the visual overhaul didn't quietly break the interaction fix underneath it.
- **Onboarding tour + case study:** a first-visit modal introduces the tool
  and its five tabs (dismissal persisted via `localStorage`, tested for
  both the dismiss button and Escape/backdrop-click paths). See
  [`CASE_STUDY.md`](./CASE_STUDY.md) for the full narrative write-up.
- **Comprehension pass:** after everything above was built and working, a
  fresh audit asked a different question — could a non-technical visitor
  actually follow what's happening? Three real gaps closed: (1) the
  onboarding tour could only ever be seen once — its state was lifted into
  a shared `useOnboardingTour` hook so a small header button can reopen it
  anytime; (2) the Grad-CAM tab (the one every visitor sees first) had no
  heatmap color legend at all, unlike the Layers tab — extracted into a
  shared `HeatmapLegend` component and added to Grad-CAM and Compare too;
  (3) loading states said only generic "Loading model…" regardless of
  whether that meant a one-time 43MB download or an instant cached
  inference — `session.ts` now exposes `isSessionReady()` so Grad-CAM and
  Layers can show an accurate, reassuring message for each case. Verified
  by `e2e/loading-messages.spec.ts` — asserts the download message shows on
  a first load and never reappears on a second tab once the ONNX session
  (a module-level singleton) is cached.
- **Inline glossary tooltips:** a shared `InfoTip` component wraps jargon
  terms (Fast Gradient Sign Method, epsilon, confidence, Grad-CAM++,
  gradients, gradient ascent, activation) across all five tabs — tap/click
  the term for a one-line plain-English definition, dismissible via the
  same click, a click outside, or Escape. Deliberately click-based rather
  than hover-based, for the same reason the Adversarial slider had to be
  rewritten earlier: hover doesn't exist on touch devices. A real-browser
  test across all 6 tooltip instances caught an actual bug before it
  shipped — the popover text was rendering in Title Case because
  `text-transform: capitalize` (set on Grad-CAM's predicted-label styling)
  is an inherited CSS property and leaked into the tooltip, a nested
  descendant. Fixed by explicitly resetting `text-transform: none` on the
  shared component, which also protects it from the same issue in any
  future context it's dropped into.
- **Rewriting the two most confusing captions:** the Features tab's
  filter-visualization images are genuinely abstract, near-psychedelic
  patterns — the old intro explained _what_ they were (gradient ascent
  output) without addressing the actual reaction a first-time visitor has,
  which is closer to "is this broken?" The copy now names that reaction
  directly up front ("these will look like abstract patterns, not
  recognizable objects — that's expected, not a rendering glitch") and
  explains _why_ early filters only recognize edges and colors, not whole
  objects. The other half of this phase — explaining why Grad-CAM
  confidence often reads a suspicious-looking 100.0% — turned out to
  already be covered by the confidence `InfoTip` added in Phase B, so no
  separate change was needed there.

## The TensorFlow.js stretch goal — true per-upload adversarial attacks

Everything above uses ONNX Runtime Web, which is inference-only. FGSM
genuinely needs the gradient of loss with respect to every input pixel —
something ONNX Runtime can't compute — so the Adversarial tab's original
gallery could only ever show 10 fixed, precomputed sample images. Closing
that gap meant standing up a second, independent, gradient-capable engine.

**The build, in order, each step verified before moving to the next:**

1. **Feasibility spike first.** Before writing any real code, confirmed
   `@tensorflow/tfjs` (the pure-JS package, not the native-binding
   `tfjs-node`) actually computes gradients with respect to input pixels
   through a conv layer — the exact primitive FGSM needs. This is what
   de-risked the whole effort before committing hours to it.
2. **Hand-ported ResNet-18** using TF.js's Core API (not the Layers API —
   explicit numeric padding was required to exactly match ONNX's symmetric
   zero-padding; `'same'`/`'valid'` semantics differ subtly from PyTorch's).
   Inspected the actual ONNX graph node-by-node rather than assuming
   textbook ResNet-18 — this caught something real: PyTorch's export had
   already fused BatchNorm into the preceding Conv layer (no separate
   BatchNormalization nodes exist in the graph), which simplified the port
   to just Conv+bias, ReLU, and residual Add.
3. **Weights extracted directly from the trained ONNX model**
   (`ml/src/extract_weights_for_tfjs.py`), with conv kernels transposed
   from PyTorch/ONNX's `[out,in,kH,kW]` layout to TensorFlow's
   `[kH,kW,in,out]` — the one detail most likely to silently produce a
   model that _runs_ but gives wrong answers.
4. **Numerically verified before trusting anything built on top**: the
   TF.js port's logits matched the real ONNX model to a max difference of
   **0.000006** across sample images — tighter than the original
   PyTorch↔ONNX export's own parity check.
5. **Real FGSM** (`lib/tfjs/fgsm.ts`, via `tf.grad`) validated against the
   known-correct Kaggle/PyTorch reference: 10/10 clean predictions matched
   exactly, 7/10 adversarial results matched exactly. The other 3 have an
   honest, verified explanation — `sharp` (this pipeline's JPEG decoder)
   and PIL (the notebook's) produce slightly different pixel values, and
   FGSM's sign-based perturbation is inherently sensitive to exactly that
   kind of difference for borderline pixels. This doesn't matter for the
   shipped feature, which computes a fresh attack on whatever pixels the
   browser itself decodes rather than trying to reproduce Kaggle's exact
   numbers.
6. **Real Grad-CAM++** (`lib/tfjs/gradcamPlusPlus.ts`, one real gradient via
   `tf.grad` on the intermediate activation, then the same elementwise
   weighting formula from the training notebook): 10/10 predictions
   matched, every heatmap genuinely spatially-varying and non-degenerate.
7. **Shipped as a fully isolated, lazy-loaded addition** — `LiveFgsmPlayground`
   on the Adversarial tab lets you upload any photo and get a genuine,
   live, gradient-based attack. `@tensorflow/tfjs` (~1MB) and its ~43MB
   weight file are only fetched if you actually use this feature —
   `e2e/tfjs-lazy-load.spec.ts` confirms **zero** TF.js-related network
   requests happen just from opening the Adversarial tab and browsing the
   precomputed gallery, and a second test confirms uploading a real photo
   produces a genuine result end-to-end.
8. **Live Grad-CAM++ shipped too**, on the Compare tab's own
   `LiveGradCamPlusPlusPlayground` — upload any photo and see live
   Grad-CAM (ONNX) next to true live Grad-CAM++ (TF.js, real gradients) for
   that same image, both computed on demand. Both playgrounds dynamically
   import the same `lib/tfjs/model` chunk, so a visitor who tries one
   doesn't pay to download the ~43MB TF.js weights a second time when
   trying the other — confirmed by checking the built chunk didn't
   duplicate. Also fixed a real messaging inconsistency this surfaced:
   Compare's intro previously said Grad-CAM++ "can't run client-side,"
   which stopped being true the moment this playground shipped — the copy
   now correctly explains that the _fast_ engine used everywhere else in
   the app can't, while a second, slower engine, used only here, can.

## What's next

Every phase from the original blueprint is complete, the full comprehension
pass (Phase A/B/C), and the TensorFlow.js stretch goal for true per-upload
FGSM _and_ Grad-CAM++. What's left is smaller, second-order polish:

1. An epsilon slider for the live FGSM playground (currently fixed at 0.03,
   matching the precomputed gallery) — would let a visitor feel out the
   sensitivity themselves rather than only seeing one fixed value.
2. Possibly consolidating the "second engine" messaging across both
   playgrounds so a first-time visitor has a single clear mental model for
   why the app downloads two different ~40MB+ files for two different
   capabilities, rather than encountering that explanation twice,
   independently, in two different tabs.
