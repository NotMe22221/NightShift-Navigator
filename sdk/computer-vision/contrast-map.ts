/**
 * Contrast Map Generation
 * Applies Sobel edge detection to generate contrast maps
 */

import { ContrastMap } from './index';

/**
 * Generate a contrast map from a camera frame
 * Uses Sobel edge detection and normalizes values to 0-1 range
 * 
 * @param frame - Camera frame to analyze
 * @returns ContrastMap with normalized contrast values
 */
export function generateContrastMap(frame: ImageData): ContrastMap {
  const width = frame.width;
  const height = frame.height;
  const contrastData = new Float32Array(width * height);

  // Convert to grayscale first
  const gray = new Float32Array(width * height);
  for (let i = 0; i < frame.data.length; i += 4) {
    const r = frame.data[i];
    const g = frame.data[i + 1];
    const b = frame.data[i + 2];
    gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  let maxMagnitude = 0;

  // Apply Sobel operator
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      // Convolve with Sobel kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray[idx] * sobelX[kernelIdx];
          gy += gray[idx] * sobelY[kernelIdx];
        }
      }

      // Compute gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      contrastData[y * width + x] = magnitude;
      maxMagnitude = Math.max(maxMagnitude, magnitude);
    }
  }

  // Normalize to 0-1 range
  if (maxMagnitude > 0) {
    for (let i = 0; i < contrastData.length; i++) {
      contrastData[i] /= maxMagnitude;
    }
  }

  return {
    width,
    height,
    data: contrastData,
  };
}
