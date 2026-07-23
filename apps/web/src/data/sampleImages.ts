export interface SampleImage {
  filename: string;
  label: string;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  { filename: 'sample_00_chain_saw.jpg', label: 'chain saw' },
  { filename: 'sample_01_parachute.jpg', label: 'parachute' },
  { filename: 'sample_02_English_springer.jpg', label: 'English springer' },
  { filename: 'sample_03_church.jpg', label: 'church' },
  { filename: 'sample_04_garbage_truck.jpg', label: 'garbage truck' },
  { filename: 'sample_05_tench.jpg', label: 'tench' },
  { filename: 'sample_06_tench.jpg', label: 'tench' },
  { filename: 'sample_07_golf_ball.jpg', label: 'golf ball' },
  { filename: 'sample_08_French_horn.jpg', label: 'French horn' },
  { filename: 'sample_09_tench.jpg', label: 'tench' },
];

export function sampleImageUrl(filename: string): string {
  return `/samples/${filename}`;
}
