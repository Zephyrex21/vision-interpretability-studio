"""
Feature visualization via gradient ascent — standalone reference implementation.

Mirrors `notebooks/vision_interpretability_phase1.ipynb` section 6. Starting
from random noise (not a real photo) and maximizing a single filter's mean
activation reveals what that filter has learned to detect, independent of
any particular input image.
"""
from __future__ import annotations

import random

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


def visualize_filter(
    model: nn.Module,
    layer: nn.Module,
    filter_idx: int,
    device: torch.device,
    img_size: int = 160,
    steps: int = 120,
    lr: float = 0.05,
    l2_weight: float = 1e-3,
    jitter: int = 6,
    blur_every: int = 4,
) -> np.ndarray:
    """Gradient ascent on pixel values to maximize a single filter's mean activation.

    Returns an [H, W, 3] float array in [0, 1].
    """
    activation_holder: dict[str, torch.Tensor] = {}

    def hook(module, inp, out):
        activation_holder["value"] = out

    handle = layer.register_forward_hook(hook)

    image = torch.rand(1, 3, img_size, img_size, device=device) * 0.2 + 0.4
    image.requires_grad_(True)
    optimizer = torch.optim.Adam([image], lr=lr)

    try:
        for step in range(steps):
            optimizer.zero_grad(set_to_none=True)

            dx, dy = random.randint(-jitter, jitter), random.randint(-jitter, jitter)
            jittered = torch.roll(image, shifts=(dx, dy), dims=(2, 3))

            model(jittered.clamp(0, 1))
            activation = activation_holder["value"][0, filter_idx]
            loss = -activation.mean() + l2_weight * (image**2).mean()
            loss.backward()
            optimizer.step()

            with torch.no_grad():
                image.clamp_(0, 1)
                if blur_every and step % blur_every == 0:
                    blurred = F.avg_pool2d(image, kernel_size=3, stride=1, padding=1)
                    image.copy_(0.85 * image + 0.15 * blurred)
    finally:
        handle.remove()

    return image.detach()[0].cpu().permute(1, 2, 0).numpy()
