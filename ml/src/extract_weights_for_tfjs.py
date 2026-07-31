"""
Extracts ResNet-18 weights from the notebook's model.onnx into a format the
TensorFlow.js port can load: a single weights.bin (concatenated float32
tensors) + manifest.json describing each tensor's name, shape, and byte
range.

Conv kernels are transposed from ONNX/PyTorch's [out_ch, in_ch, kH, kW]
layout to TensorFlow's [kH, kW, in_ch, out_ch] layout — this is the one
detail that silently produces a model that *runs* but gives wrong answers
if missed. Everything else (fc weights, biases, input mean/std) is layout-
independent and copied as-is.

Usage:
    python3 extract_weights_for_tfjs.py \
        --input path/to/model.onnx \
        --output-dir path/to/output/
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import onnx
from onnx import numpy_helper


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    model = onnx.load(args.input)
    graph = model.graph
    initializers = {init.name: numpy_helper.to_array(init) for init in graph.initializer}

    manifest = []
    binary_chunks = []
    byte_offset = 0

    def add_tensor(name: str, array: np.ndarray):
        nonlocal byte_offset
        array = array.astype(np.float32)
        data = array.tobytes()
        manifest.append({
            "name": name,
            "shape": list(array.shape),
            "byteOffset": byte_offset,
            "byteLength": len(data),
        })
        binary_chunks.append(data)
        byte_offset += len(data)

    # Input normalization (mean/std) — copied as-is, already [1,3,1,1].
    add_tensor("input_mean", initializers["mean"].reshape(3))
    add_tensor("input_std", initializers["std"].reshape(3))

    # Every Conv node's weight+bias, transposed OIHW -> HWIO, named by the
    # ONNX initializer name so the JS side can look them up positionally in
    # the same node-traversal order used to verify the architecture.
    conv_bias_pairs = []
    for node in graph.node:
        if node.op_type != "Conv":
            continue
        weight_name, bias_name = node.input[1], node.input[2]
        conv_bias_pairs.append((weight_name, bias_name))

    for i, (w_name, b_name) in enumerate(conv_bias_pairs):
        kernel = initializers[w_name]  # [out, in, kH, kW]
        kernel_hwio = np.transpose(kernel, (2, 3, 1, 0))  # -> [kH, kW, in, out]
        add_tensor(f"conv{i}_kernel", kernel_hwio)
        add_tensor(f"conv{i}_bias", initializers[b_name])

    # Final FC layer — PyTorch Linear weight is [out, in]; TF.js dense
    # kernel expects [in, out], so transpose.
    fc_weight = initializers["backbone.fc.weight"]  # [10, 512]
    add_tensor("fc_kernel", fc_weight.T)  # -> [512, 10]
    add_tensor("fc_bias", initializers["backbone.fc.bias"])

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(output_dir / "weights.bin", "wb") as f:
        for chunk in binary_chunks:
            f.write(chunk)

    with open(output_dir / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"Extracted {len(manifest)} tensors, {byte_offset / 1e6:.1f}MB total")
    print(f"Conv layers found: {len(conv_bias_pairs)} (expect 20 for ResNet-18)")
    print(f"Wrote {output_dir / 'weights.bin'} and {output_dir / 'manifest.json'}")


if __name__ == "__main__":
    main()
