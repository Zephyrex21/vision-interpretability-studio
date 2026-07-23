# Contributing to Vision Interpretability Studio

This started as a personal portfolio project, but contributions, bug reports,
and ideas are welcome.

## Project structure

- `apps/web/` — React + Vite + TypeScript frontend. See `apps/web/` for
  install/test/build instructions.
- `ml/` — model training and interpretability math. The Kaggle training
  notebook lives in `ml/notebooks/`; reusable Python logic mirrors it in
  `ml/src/`.

See the root `README.md` for the full architecture writeup, including the
reasoning behind the live Grad-CAM implementation.

## Development setup

```bash
cd apps/web
npm install
npm run dev
```

## Before submitting a change

Run the full check sequence from `apps/web/`:

```bash
npm run format:check
npm run lint
npx tsc -b
npm run test
npm run build
```

All five should pass. CI (`.github/workflows/ci.yml`) runs the same checks
automatically on every pull request.

## Reporting bugs / suggesting features

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce (for bugs) or the use case (for features)

## Code style

- TypeScript, formatted with Prettier (`npm run format`), linted with oxlint.
- Keep components and their CSS Modules co-located.
- New logic touching the interpretability math (Grad-CAM, upsampling, etc.)
  should come with a unit test — see `src/lib/onnx/inference.test.ts` and
  `src/lib/gradcam/renderOverlay.test.ts` for the existing pattern.