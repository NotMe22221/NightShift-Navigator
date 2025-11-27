/**
 * Brightness Histogram Computation
 * Extracts luminance values and computes histogram statistics
 */

/**
 * Brightness histogram with 256 bins and statistics
 */
export interface BrightnessHistogram {
  bins: number[] | Uint32Array; // 256 bins for 0-255 luminance (typed array for performance)
  mean: number;
  median: number;
  stdDev: number;
}

/**
 * Compute brightness histogram from camera frame
 * Uses luminance formula: Y = 0.299R + 0.587G + 0.114B
 * Optimized for performance with single-pass computation
 * 
 * @param frame - ImageData from camera
 * @returns BrightnessHistogram with 256 bins and statistics
 */
export function computeBrightnessHistogram(frame: ImageData): BrightnessHistogram {
  const bins = new Uint32Array(256); // Use typed array for better performance
  const pixelCount = frame.width * frame.height;
  
  // Single-pass computation: histogram, sum, and sum of squares
  let sum = 0;
  let sumOfSquares = 0;
  
  // Use integer arithmetic for better performance
  // Multiply by 1000 to maintain precision, then divide later
  const data = frame.data;
  const length = data.length;
  
  for (let i = 0; i < length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Integer arithmetic: Y = 0.299R + 0.587G + 0.114B
    // Using fixed-point: multiply by 1000, then divide
    const luminanceInt = ((299 * r + 587 * g + 114 * b) / 1000) | 0;
    
    bins[luminanceInt]++;
    sum += luminanceInt;
    sumOfSquares += luminanceInt * luminanceInt;
  }

  // Compute mean
  const mean = sum / pixelCount;

  // Compute median efficiently from histogram bins (O(256) instead of O(n log n))
  const medianTarget = pixelCount / 2;
  let cumulativeCount = 0;
  let median = 0;
  
  for (let i = 0; i < 256; i++) {
    cumulativeCount += bins[i];
    if (cumulativeCount >= medianTarget) {
      median = i;
      break;
    }
  }

  // Compute standard deviation using sum of squares
  // stdDev = sqrt(E[X^2] - E[X]^2)
  const variance = (sumOfSquares / pixelCount) - (mean * mean);
  const stdDev = Math.sqrt(Math.max(0, variance)); // Ensure non-negative

  return {
    bins, // Return typed array directly for better performance
    mean,
    median,
    stdDev,
  };
}
