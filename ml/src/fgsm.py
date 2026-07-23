"""
FGSM (Fast Gradient Sign Method) — standalone reference implementation.

Mirrors `notebooks/vision_interpretability_phase1.ipynb` section 7. Operates
in raw [0, 1] pixel space because the trained model folds ImageNet
normalization into its first op (see `NormalizedResNet` in the notebook /
`export_onnx.py`), so `epsilon` here is directly a fraction of the full
pixel-intensity range.
"""
from __future__ import annotations

import torch
import torch.nn as nn


def fgsm_attack(
    model: nn.Module,
    image: torch.Tensor,
    true_label: int,
    epsilon: float,
    device: torch.device,
) -> torch.Tensor:
    """image: [1, 3, H, W] in [0, 1]. Returns the perturbed image, still in [0, 1]."""
    image = image.clone().detach().to(device).requires_grad_(True)
    label_tensor = torch.tensor([true_label], device=device)

    criterion = nn.CrossEntropyLoss()
    logits = model(image)
    loss = criterion(logits, label_tensor)
    model.zero_grad(set_to_none=True)
    loss.backward()

    perturbation = epsilon * image.grad.sign()
    adversarial = (image + perturbation).clamp(0, 1).detach()
    return adversarial
