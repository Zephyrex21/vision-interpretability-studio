# Vision Interpretability Studio — Case Study

**A zero-cost, in-browser tool for seeing inside a vision model — and the
engineering problem that shaped almost every decision in it: plain ONNX
Runtime Web can't backpropagate.**

Live: [add your Vercel URL here] · Code: [add your GitHub URL here]

---

## The problem with "just add Grad-CAM"

Most student interpretability projects stop at "trained a CNN, ran
Grad-CAM on three example images, screenshotted the heatmap." I wanted
something a visitor could actually use — upload your own photo, watch a
real model inspect it, live, in the browser, for free.

The catch: Grad-CAM's textbook definition needs the gradient of a class
score with respect to an intermediate layer's activations. ONNX Runtime —
including `onnxruntime-web`, the engine this app runs on — is
**inference-only**. No backpropagation, no autograd, full stop. Every
tutorial that shows Grad-CAM "in the browser" is either running a server
somewhere or faking it.

## The way out: an exact answer, not an approximation

Grad-CAM's usual channel-weighting step — global-average-pool the gradient
of the class score, per channel — has a special case. When a network ends
in `GlobalAveragePool → single Linear layer` (exactly what ResNet-18 does),
that gradient-based weight is **mathematically identical** to the Linear
layer's own weight row for that class. This is the original CAM result
(Zhou et al., 2016), and the Grad-CAM paper itself proves Grad-CAM reduces
exactly to CAM for this architecture.

So the fix wasn't a workaround — it was recognizing the math already
guaranteed an exact result with zero gradients:

1. **Graph surgery** on the trained ONNX model (`ml/src/prepare_gradcam_export.py`)
   exposes the last convolutional block's activation map as a second output
   — no retraining, no PyTorch needed for this step, just editing the
   exported graph directly.
2. **One forward pass** returns both the class logits and that activation
   map.
3. `CAM = ReLU(Σ_c weight[class, c] × activation_c)`, computed as plain
   JavaScript array math in the browser.

Same trick extended the **layer-scrubber** feature: five stages of the
network (stem, layer1–4) exposed as extra outputs, each rendered as a
mean-activation "energy map" — a genuinely different question from Grad-CAM
("where is this layer active" vs. "why this class"), but the same
forward-only philosophy.

## Where the trick runs out: honest scope, not silent failure

Grad-CAM++ and FGSM adversarial perturbation **do** need real gradients —
Grad-CAM++'s higher-order weighting terms don't reduce to a closed form,
and FGSM needs the gradient of loss with respect to every input pixel,
which requires backpropagating through the entire network, not just the
final layer.

Rather than fake these or silently drop them, they're precomputed once on
Kaggle (where real PyTorch autograd is available) for ten sample images,
shipped as static comparison data. The Adversarial and Compare tabs are
upfront about which parts are live-for-any-image versus precomputed-for-
these-samples. A true per-upload version of either would need a
backprop-capable in-browser runtime (e.g. re-hosting the weights in
TensorFlow.js) — a real engineering lift, tracked as a stretch goal rather
than glossed over.

## The most interesting finding

At `ε = 0.03` — a pixel perturbation of roughly 3% of full brightness,
invisible to a human eye — FGSM flips **4 of 10** sample predictions,
several with **over 90% confidence in the wrong class**. A chain saw
becomes a "cassette player" at 99.95% confidence. Nothing about the image
changes to a human observer.

That gap — between how confident the model sounds and how little it
actually takes to break that confidence — is the whole reason adversarial
robustness is a real subfield, not a curiosity. Seeing it happen to your
own uploaded photo, live, lands differently than reading the number in a
paper.

A smaller, funnier finding: one filter in the deepest layer (`layer4,
filter 128`) rendered as pure black in the feature-visualization gallery —
a dead ReLU, a filter that had stopped firing entirely during training and
so had nothing for gradient ascent to climb toward. A small, real artifact
of how this specific model turned out, not a bug in the visualization.

## What building this actually involved

- **Trained from scratch**, not fine-tuned — ResNet-18 on Imagenette,
  88.2% validation accuracy, so every learned filter is genuinely
  attributable to this dataset, which matters for an honest
  interpretability story.
- **Verified before shipping, not after**: every ONNX export was checked
  for PyTorch/ONNX Runtime parity (max difference: 0.000023) before being
  trusted in the browser; every piece of interpretability math got a
  standalone unit test independent of the live model; real headless-browser
  tests (Playwright) ran against the actual production build, not just
  local dev — one of these caught a genuine bug where the Adversarial tab's
  drag-to-reveal slider silently didn't work on touchscreens at all
  (`onMouseMove` never fires on touch), fixed with the Pointer Events API
  and confirmed with a synthetic `pointerType: 'touch'` event test.
- **Zero backend, zero cost**: training ran on Kaggle's free GPU tier;
  the shipped app is 100% client-side via ONNX Runtime Web on free static
  hosting. The only real cost across the whole project was time.

## Stack

React + TypeScript + Vite · ONNX Runtime Web · PyTorch (training only) ·
Framer Motion · Vitest · GitHub Actions · Kaggle (free GPU) · Vercel (free
hosting)
