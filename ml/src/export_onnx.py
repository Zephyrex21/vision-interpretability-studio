"""
Model definition + ONNX export — standalone reference implementation.

Mirrors `notebooks/vision_interpretability_phase1.ipynb` sections 3 and 8.
`NormalizedResNet` folds ImageNet-style normalization into the model's first
op, so the exported ONNX graph's public contract is "raw pixels in [0, 1]
in, logits out" — the browser never needs to reimplement normalization.
"""
from __future__ import annotations

from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


class NormalizedResNet(nn.Module):
    """ResNet-18 with ImageNet-style normalization folded in as the first op."""

    def __init__(self, num_classes: int):
        super().__init__()
        self.register_buffer("mean", torch.tensor(IMAGENET_MEAN).view(1, 3, 1, 1))
        self.register_buffer("std", torch.tensor(IMAGENET_STD).view(1, 3, 1, 1))
        self.backbone = models.resnet18(weights=None, num_classes=num_classes)

    def normalize(self, x: torch.Tensor) -> torch.Tensor:
        return (x - self.mean) / self.std

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(self.normalize(x))


def export_to_onnx(
    model: NormalizedResNet,
    output_path: str | Path,
    img_size: int = 160,
    opset_version: int = 17,
) -> Path:
    """Exports `model` to ONNX with a dynamic batch axis. Returns the output path."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    model.eval()
    device = next(model.parameters()).device
    dummy_input = torch.rand(1, 3, img_size, img_size, device=device)

    torch.onnx.export(
        model,
        dummy_input,
        str(output_path),
        input_names=["pixel_values"],
        output_names=["logits"],
        dynamic_axes={"pixel_values": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=opset_version,
    )
    return output_path


def verify_onnx_parity(
    model: NormalizedResNet,
    onnx_path: str | Path,
    sample_batch: torch.Tensor,
    tolerance: float = 1e-3,
) -> float:
    """Runs the same batch through PyTorch and ONNX Runtime; returns max abs diff.

    Raises AssertionError if the diff exceeds `tolerance` — treat that as a
    hard stop, not a warning, before shipping the export to the browser.
    """
    import numpy as np
    import onnxruntime as ort

    device = next(model.parameters()).device
    model.eval()
    with torch.no_grad():
        torch_logits = model(sample_batch.to(device)).cpu().numpy()

    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    onnx_logits = session.run(["logits"], {"pixel_values": sample_batch.numpy()})[0]

    max_abs_diff = float(np.abs(torch_logits - onnx_logits).max())
    assert max_abs_diff < tolerance, (
        f"ONNX/PyTorch outputs diverge by {max_abs_diff:.6f}, exceeding tolerance {tolerance}."
    )
    return max_abs_diff
