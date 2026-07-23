"""
Grad-CAM / Grad-CAM++ — standalone reference implementation.

This mirrors the GradCAM class defined in
`notebooks/vision_interpretability_phase1.ipynb` section 5. It's kept here
as a plain, importable module for code review, local unit testing, and
potential reuse outside the notebook context (e.g. a future batch-evaluation
script). The notebook remains self-contained on purpose — Kaggle notebooks
can't reliably import sibling repo files, so `ml/src/` is a mirror, not a
dependency of the notebook.
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class GradCAM:
    """Grad-CAM and Grad-CAM++ via forward/backward hooks on a target layer."""

    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self.activations: torch.Tensor | None = None
        self.gradients: torch.Tensor | None = None
        target_layer.register_forward_hook(self._save_activations)
        target_layer.register_full_backward_hook(self._save_gradients)

    def _save_activations(self, module, inp, out):
        self.activations = out.detach()

    def _save_gradients(self, module, grad_in, grad_out):
        self.gradients = grad_out[0].detach()

    def __call__(
        self,
        image: torch.Tensor,
        class_idx: int | None = None,
        plus_plus: bool = False,
    ):
        """image: [1, 3, H, W] in [0, 1]. Returns (cam [H, W] in [0, 1], class_idx, confidence)."""
        self.model.zero_grad(set_to_none=True)
        logits = self.model(image)
        probs = F.softmax(logits, dim=1)

        if class_idx is None:
            class_idx = int(logits.argmax(dim=1).item())
        confidence = float(probs[0, class_idx].item())

        logits[0, class_idx].backward()

        activations = self.activations[0]
        gradients = self.gradients[0]

        if plus_plus:
            grad_sq = gradients**2
            grad_cube = gradients**3
            denom = 2 * grad_sq + (activations * grad_cube).sum(dim=(1, 2), keepdim=True)
            denom = torch.where(denom != 0, denom, torch.ones_like(denom))
            alpha = grad_sq / denom
            weights = (alpha * F.relu(gradients)).sum(dim=(1, 2))
        else:
            weights = gradients.mean(dim=(1, 2))

        cam = F.relu((weights.view(-1, 1, 1) * activations).sum(dim=0))
        cam = F.interpolate(
            cam.unsqueeze(0).unsqueeze(0),
            size=image.shape[-2:],
            mode="bilinear",
            align_corners=False,
        )[0, 0]

        cam_min, cam_max = cam.min(), cam.max()
        cam = (cam - cam_min) / (cam_max - cam_min + 1e-8)

        return cam.cpu().numpy(), class_idx, confidence
