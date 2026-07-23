"""
Lightweight, torch-free tests for the interpretability math.

These mirror the tensor operations used in gradcam.py / fgsm.py using plain
NumPy stand-ins, so the core logic (weighting, normalization, clamping) can
be verified in CI without installing PyTorch or a GPU. They are NOT a
substitute for actually running the notebook on Kaggle — they only catch
math/shape regressions in the formulas themselves.

Run with: python -m pytest ml/src/test_math.py -v
(requires: pip install pytest numpy)
"""
import numpy as np


def overlay_heatmap(image_chw: np.ndarray, cam: np.ndarray, alpha: float = 0.45) -> np.ndarray:
    low = np.array([0.165, 0.141, 0.439])
    high = np.array([1.0, 0.706, 0.329])
    cam_rgb = low[None, None, :] + cam[:, :, None] * (high - low)[None, None, :]
    base = np.transpose(image_chw, (1, 2, 0))
    blended = (1 - alpha * cam[:, :, None]) * base + (alpha * cam[:, :, None]) * cam_rgb
    return np.clip(blended * 255, 0, 255).astype(np.uint8)


def gradcam_weights(activations: np.ndarray, gradients: np.ndarray, plus_plus: bool = False):
    if plus_plus:
        grad_sq = gradients**2
        grad_cube = gradients**3
        denom = 2 * grad_sq + (activations * grad_cube).sum(axis=(1, 2), keepdims=True)
        denom = np.where(denom != 0, denom, np.ones_like(denom))
        alpha = grad_sq / denom
        return (alpha * np.maximum(gradients, 0)).sum(axis=(1, 2))
    return gradients.mean(axis=(1, 2))


def gradcam_from_weights(activations: np.ndarray, weights: np.ndarray) -> np.ndarray:
    cam = np.maximum((weights.reshape(-1, 1, 1) * activations).sum(axis=0), 0)
    cam_min, cam_max = cam.min(), cam.max()
    return (cam - cam_min) / (cam_max - cam_min + 1e-8)


def fgsm_perturb(image: np.ndarray, grad: np.ndarray, epsilon: float) -> np.ndarray:
    perturbation = epsilon * np.sign(grad)
    return np.clip(image + perturbation, 0, 1)


# --- tests -------------------------------------------------------------


def test_overlay_heatmap_shape_and_range():
    img = np.random.rand(3, 32, 32).astype(np.float32)
    cam = np.random.rand(32, 32).astype(np.float32)
    out = overlay_heatmap(img, cam)
    assert out.shape == (32, 32, 3)
    assert out.dtype == np.uint8
    assert out.min() >= 0 and out.max() <= 255


def test_gradcam_output_normalized_to_unit_range():
    activations = np.random.randn(8, 5, 5)
    gradients = np.random.randn(8, 5, 5)
    weights = gradcam_weights(activations, gradients, plus_plus=False)
    cam = gradcam_from_weights(activations, weights)
    assert cam.shape == (5, 5)
    assert cam.min() >= 0.0 - 1e-6
    assert cam.max() <= 1.0 + 1e-6


def test_gradcam_plus_plus_no_nan_and_normalized():
    activations = np.random.randn(8, 5, 5)
    gradients = np.random.randn(8, 5, 5)
    weights = gradcam_weights(activations, gradients, plus_plus=True)
    cam = gradcam_from_weights(activations, weights)
    assert not np.isnan(cam).any()
    assert cam.min() >= 0.0 - 1e-6
    assert cam.max() <= 1.0 + 1e-6


def test_gradcam_handles_all_zero_gradients_without_dividing_by_zero():
    activations = np.random.randn(4, 3, 3)
    gradients = np.zeros((4, 3, 3))
    weights = gradcam_weights(activations, gradients, plus_plus=True)
    assert not np.isnan(weights).any()


def test_fgsm_respects_epsilon_budget():
    image = np.random.rand(3, 16, 16).astype(np.float32)
    grad = np.random.randn(3, 16, 16).astype(np.float32)
    epsilon = 0.03
    adversarial = fgsm_perturb(image, grad, epsilon)
    assert adversarial.shape == image.shape
    assert adversarial.min() >= 0.0 and adversarial.max() <= 1.0
    assert np.abs(adversarial - image).max() <= epsilon + 1e-6


def test_fgsm_zero_epsilon_is_a_no_op():
    image = np.random.rand(3, 8, 8).astype(np.float32)
    grad = np.random.randn(3, 8, 8).astype(np.float32)
    adversarial = fgsm_perturb(image, grad, epsilon=0.0)
    np.testing.assert_allclose(adversarial, image, atol=1e-7)


if __name__ == "__main__":
    import sys

    tests = [obj for name, obj in list(globals().items()) if name.startswith("test_")]
    failures = 0
    for test in tests:
        try:
            test()
            print(f"PASS  {test.__name__}")
        except AssertionError as e:
            failures += 1
            print(f"FAIL  {test.__name__}: {e}")
    print(f"\n{len(tests) - failures}/{len(tests)} passed")
    sys.exit(1 if failures else 0)
