"""
Prepares a Grad-CAM-capable ONNX export from the notebook's `model.onnx`.

Why this exists: plain ONNX Runtime (including onnxruntime-web in the
browser) is inference-only — it has no backpropagation. Standard Grad-CAM
normally needs gradients of the class score w.r.t. an intermediate layer's
activations, which the browser can't compute.

This model's architecture ends in GlobalAveragePool -> a single Linear
layer, and for exactly that architecture, Grad-CAM's gradient-based channel
weighting is mathematically identical to that Linear layer's own weight row
for the target class (the classic CAM result — Zhou et al. 2016; the
Grad-CAM paper itself, Selvaraju et al. 2017 Sec. 3, proves Grad-CAM reduces
exactly to CAM for GAP+FC architectures). So we can get an exact result with
zero backpropagation:

  1. Add the last conv block's activation map as a second graph output
     (pure graph surgery — no retraining, no PyTorch needed).
  2. Extract the final Linear layer's weight matrix as a small JSON file.
  3. In the browser: one forward pass gives both the logits AND the
     activation map; the CAM is then `ReLU(sum_c W[class, c] * activation_c)`,
     computed as plain JS array math (see apps/web/src/lib/onnx/inference.ts).

Usage:
    python ml/src/prepare_gradcam_export.py \\
        --input path/to/model.onnx \\
        --output-dir path/to/output/

Requires: pip install onnx numpy
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import onnx
from onnx import helper, numpy_helper

# The last ReLU in layer4 — i.e. the final spatial activation map before
# GlobalAveragePool. This name is specific to this notebook's torch.onnx.export
# naming; if you retrain with a different PyTorch/ONNX opset, re-run
# inspect_graph() below to confirm the tensor name hasn't changed.
TARGET_TENSOR = "/backbone/layer4/layer4.1/relu_1/Relu_output_0"
ACTIVATION_SHAPE = ["batch", 512, 5, 5]  # 160x160 input -> 5x5 after layer4


def inspect_graph(model: onnx.ModelProto) -> None:
    """Prints the last several nodes of the graph — useful for re-deriving
    TARGET_TENSOR if you retrain with a different architecture or opset."""
    graph = model.graph
    print("=== Inputs ===")
    for i in graph.input:
        print(" ", i.name, [d.dim_value or d.dim_param for d in i.type.tensor_type.shape.dim])
    print("=== Outputs ===")
    for o in graph.output:
        print(" ", o.name)
    print(f"=== Last 10 of {len(graph.node)} nodes ===")
    for n in graph.node[-10:]:
        print(f"  {n.op_type:12s} {n.name:35s} -> {list(n.output)}")


def extract_fc_weights(model: onnx.ModelProto) -> dict:
    """Finds the final Gemm (fully-connected) node and returns its weights as plain lists."""
    graph = model.graph
    gemm_nodes = [n for n in graph.node if n.op_type == "Gemm"]
    if not gemm_nodes:
        raise ValueError("No Gemm node found — is this really a ResNet-style classifier?")
    gemm_node = gemm_nodes[-1]  # the classifier head is the last Gemm

    weight_name, bias_name = gemm_node.input[1], gemm_node.input[2]
    initializers = {init.name: init for init in graph.initializer}

    W = numpy_helper.to_array(initializers[weight_name]).astype(np.float32)
    b = numpy_helper.to_array(initializers[bias_name]).astype(np.float32)

    return {"weight": W.tolist(), "bias": b.tolist(), "shape": list(W.shape)}


def add_activation_output(model: onnx.ModelProto, tensor_name: str, shape: list) -> None:
    """Graph surgery: exposes an existing intermediate tensor as a graph output."""
    graph = model.graph
    producers = [n for n in graph.node if tensor_name in n.output]
    if len(producers) != 1:
        raise ValueError(
            f"Expected exactly one producer for '{tensor_name}', found {len(producers)}. "
            "Run inspect_graph() to find the correct tensor name for this model."
        )

    already_exposed = any(o.name == tensor_name for o in graph.output)
    if not already_exposed:
        new_output = helper.make_tensor_value_info(tensor_name, onnx.TensorProto.FLOAT, shape)
        graph.output.append(new_output)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Path to the notebook's model.onnx")
    parser.add_argument("--output-dir", required=True, help="Where to write model_gradcam.onnx and fc_weights.json")
    parser.add_argument("--inspect", action="store_true", help="Print graph structure and exit (no output written)")
    args = parser.parse_args()

    model = onnx.load(args.input)

    if args.inspect:
        inspect_graph(model)
        return

    fc_weights = extract_fc_weights(model)
    add_activation_output(model, TARGET_TENSOR, ACTIVATION_SHAPE)
    onnx.checker.check_model(model)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    onnx_out = output_dir / "model_gradcam.onnx"
    weights_out = output_dir / "fc_weights.json"

    onnx.save(model, str(onnx_out))
    with open(weights_out, "w") as f:
        json.dump(fc_weights, f)

    print(f"Wrote {onnx_out}")
    print(f"Wrote {weights_out}  (fc weight shape: {fc_weights['shape']})")
    print(f"Graph outputs: {[o.name for o in model.graph.output]}")


if __name__ == "__main__":
    main()
