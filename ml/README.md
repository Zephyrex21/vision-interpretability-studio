# ml/

Model training and interpretability math for Vision Interpretability Studio.

```
ml/
├── notebooks/
│   └── vision_interpretability_phase1.ipynb   # run this on Kaggle
├── src/
│   ├── export_onnx.py    # NormalizedResNet model + ONNX export/parity check
│   ├── gradcam.py         # Grad-CAM / Grad-CAM++
│   ├── feature_viz.py     # gradient-ascent feature visualization
│   ├── fgsm.py             # FGSM adversarial perturbation
│   └── test_math.py       # torch-free math tests (numpy stand-ins)
├── requirements.txt
└── README.md
```

`src/*.py` mirrors the logic that lives in the notebook, kept here as plain
importable modules for code review and local testing. **The notebook itself
is self-contained and does not import from `src/`** — Kaggle notebooks can't
reliably import sibling repo files, so treat `src/` as a readable mirror of
the notebook's logic, not a dependency of it.

---

## Running the notebook on Kaggle

1. Go to [kaggle.com/code](https://www.kaggle.com/code) → **New Notebook**.
2. Upload `notebooks/vision_interpretability_phase1.ipynb` (File → Import Notebook),
   or copy/paste its cells into a fresh notebook.
3. In the right sidebar, click **Add Input** → search `Imagenette 160 px` →
   add the dataset published by **jhoward** (the fastai creator's own
   release: https://www.kaggle.com/datasets/jhoward/imagenette-160-px).
4. In **Settings** (right sidebar), set **Accelerator** to a GPU (T4 x1 or
   P100 — either works fine on the free tier).
5. Run all cells top to bottom (**Run → Run All**).

Training takes roughly 20–35 minutes on a free-tier GPU for the default 25
epochs. Everything the notebook produces — the ONNX model, feature
visualizations, class labels, training curves, and sample images — is
bundled into `/kaggle/working/vision_interpretability_artifacts.zip` by the
final cell. Download it from the notebook's **Output** panel when the run
finishes.

### What the notebook does, section by section

| Section | Output |
|---|---|
| 1–2. Setup & Data | Locates the Imagenette train/val folders automatically under `/kaggle/input`, builds dataloaders |
| 3. Model | `NormalizedResNet` — ResNet-18 trained from scratch, with input normalization folded into the model itself |
| 4. Training | 25 epochs, SGD + OneCycle LR, best-checkpoint saving, loss/accuracy curves |
| 5. Grad-CAM / Grad-CAM++ | Hooked to `layer4`, visualized on sample validation images using the app's own violet→amber color scale |
| 6. Feature Visualization | Gradient ascent per filter across 4 layers, saved as a gallery + `metadata.json` |
| 7. Adversarial (FGSM) | Live prediction-flip demo with amplified perturbation visualization |
| 8. ONNX Export | Exports the full model (normalization included) to `model.onnx`, then verifies PyTorch↔ONNX Runtime parity before trusting it |
| 9. Save Artifacts | Bundles everything into a single downloadable zip |

### Design note: normalization is inside the model

`NormalizedResNet` applies ImageNet mean/std normalization as its first
operation, so every tensor elsewhere in the notebook — and eventually every
tensor in the browser — stays in plain `[0, 1]` pixel space. This is why
FGSM's `epsilon` is directly interpretable as "a fraction of full pixel
brightness," and it's why Phase 2/3 won't need to reimplement normalization
in JavaScript: the exported ONNX graph accepts raw `[0, 1]` pixels straight
from a `<canvas>`.

---

## Installation (local — for `src/` only)

The notebook is meant to run on Kaggle (free GPU). Installing locally is
only needed if you want to run the math tests or inspect `src/` yourself.

```bash
cd ml
pip install -r requirements.txt   # or just: pip install numpy pytest
```

## Testing steps

`src/test_math.py` validates the actual math used by Grad-CAM, Grad-CAM++,
FGSM, and the heatmap color overlay — using NumPy stand-ins so it runs in
seconds with no GPU and no PyTorch install. It is **not** a substitute for
running the real notebook; it exists to catch formula/shape regressions
(e.g. a division-by-zero on all-zero gradients, an unnormalized CAM range,
an epsilon budget that isn't actually respected) before they'd otherwise
surface deep in a multi-hour Kaggle run.

```bash
cd ml
python3 src/test_math.py
# or, with pytest installed:
python -m pytest src/test_math.py -v
```

Expected result: `6/6 passed`.

| Test | What it catches |
|---|---|
| `test_overlay_heatmap_shape_and_range` | Heatmap overlay produces a valid `[H, W, 3]` uint8 image |
| `test_gradcam_output_normalized_to_unit_range` | Grad-CAM output is properly normalized to `[0, 1]` |
| `test_gradcam_plus_plus_no_nan_and_normalized` | Grad-CAM++'s higher-order weighting doesn't produce NaNs |
| `test_gradcam_handles_all_zero_gradients_without_dividing_by_zero` | The Grad-CAM++ denominator guard actually works |
| `test_fgsm_respects_epsilon_budget` | No pixel ever moves by more than `epsilon` |
| `test_fgsm_zero_epsilon_is_a_no_op` | Sanity check: zero perturbation changes nothing |

---

## Next step

Once you have `vision_interpretability_artifacts.zip` downloaded from
Kaggle, run the Grad-CAM export preparation script before handing
`model.onnx` to the web app:

```bash
cd ml
python3 src/prepare_gradcam_export.py \
  --input /path/to/artifacts/model.onnx \
  --output-dir /path/to/artifacts/
```

This performs graph surgery to expose the last convolutional block's
activation map, **plus four earlier stages (stem, layer1, layer2, layer3)**,
as additional model outputs, and extracts the classifier head's weights to
`fc_weights.json`. Together these let the browser compute an **exact**
Grad-CAM as a single forward pass — no backpropagation needed — and also
power the layer-scrubber (`LayersView`), which shows how a real image's
activation energy shifts through network depth. See the module docstring in
`src/prepare_gradcam_export.py` for the full mathematical justification
(short version: this architecture's GlobalAveragePool + single Linear head
means Grad-CAM provably reduces to classic CAM, which only needs the Linear
layer's own weights; the layer-scrubber needs no such trick at all since it
only ever uses forward-pass activation magnitudes, never gradients).

Also writes `stage_metadata.json`, listing each exposed stage's tensor name,
short label (stem/layer1/.../layer4), and shape.

Then place `model_gradcam.onnx`, `fc_weights.json`, `stage_metadata.json`,
`class_labels.json`, `feature_viz/`, and a few `sample_images/` into the web
app — see the root README's Phase 2 section for exactly where each file
goes.
