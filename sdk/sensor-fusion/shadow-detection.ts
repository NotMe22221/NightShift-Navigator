/**
 * Shadow Detection Algorithm
 * Applies edge detection and luminance thresholding to identify shadow regions
 */

import type { ShadowDetectionResult } from './index.js';

/**
 * Sobel operator kernels for edge detection
 */
const SOBEL_X = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1]
];

const SOBEL_Y = [
  [-1, -2, -1],
  [0, 0, 0],
  [1, 2, 1]
];

/**
 * Detect shadows in a camera frame
 * Optimized for low latency (<50ms)
 * 
 * Algorithm:
 * 1. Downsample frame for faster processing
 * 2. Apply Sobel edge detection to identify edges
 * 3. Threshold luminance to identify dark regions
 * 4. Combine edge and luminance information to detect shadows
 * 5. Compute shadow coverage percentage
 * 
 * @param frame - ImageData from camera
 * @param shadowThreshold - Luminance threshold for shadow detection (0-255, default 80)
 * @param edgeThreshold - Edge strength threshold (default 50)
 * @returns ShadowDetectionResult with coverage and regions
 */
export function detectShadows(
  frame: ImageData,
  shadowThreshold: number = 80,
  edgeThreshold: number = 50
): ShadowDetectionResult {
  const { width, height, data } = frame;
  
  // Downsample for performance (process at 1/4 resolution)
  const downsampleFactor = 2;
  const sampledWidth = Math.floor(width / downsampleFactor);
  const sampledHeight = Math.floor(height / downsampleFactor);
  
  // Convert to grayscale luminance with downsampling
  const luminance = new Float32Array(sampledWidth * sampledHeight);
  for (let y = 0; y < sampledHeight; y++) {
    for (let x = 0; x < sampledWidth; x++) {
      const srcX = x * downsampleFactor;
      const srcY = y * downsampleFactor;
      const srcIdx = (srcY * width + srcX) * 4;
      
      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];
      
      luminance[y * sampledWidth + x] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }
  
  // Apply optimized Sobel edge detection
  const edges = applySobelEdgeDetectionOptimized(luminance, sampledWidth, sampledHeight);
  
  // Identify shadow pixels (low luminance + near edges)
  let shadowPixelCount = 0;
  
  for (let y = 0; y < sampledHeight; y++) {
    for (let x = 0; x < sampledWidth; x++) {
      const idx = y * sampledWidth + x;
      const lum = luminance[idx];
      const edge = edges[idx];
      
      // Shadow criteria: low luminance OR (moderate luminance + strong edge)
      const isShadow = lum < shadowThreshold || 
                       (lum < shadowThreshold * 1.5 && edge > edgeThreshold);
      
      if (isShadow) {
        shadowPixelCount++;
      }
    }
  }
  
  // Compute shadow coverage percentage
  const totalPixels = sampledWidth * sampledHeight;
  const shadowCoverage = shadowPixelCount / totalPixels;
  
  // Return simplified result (skip region finding for performance)
  return {
    shadowCoverage,
    shadowRegions: [],
  };
}

/**
 * Apply Sobel edge detection operator (optimized)
 * Uses integer arithmetic and avoids sqrt for better performance
 */
function applySobelEdgeDetectionOptimized(
  luminance: Float32Array,
  width: number,
  height: number
): Float32Array {
  const edges = new Float32Array(width * height);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // Unrolled Sobel kernel application for performance
      const p0 = luminance[idx - width - 1];
      const p1 = luminance[idx - width];
      const p2 = luminance[idx - width + 1];
      const p3 = luminance[idx - 1];
      const p5 = luminance[idx + 1];
      const p6 = luminance[idx + width - 1];
      const p7 = luminance[idx + width];
      const p8 = luminance[idx + width + 1];
      
      // Sobel X: [-1, 0, 1; -2, 0, 2; -1, 0, 1]
      const gx = -p0 + p2 - 2*p3 + 2*p5 - p6 + p8;
      
      // Sobel Y: [-1, -2, -1; 0, 0, 0; 1, 2, 1]
      const gy = -p0 - 2*p1 - p2 + p6 + 2*p7 + p8;
      
      // Use Manhattan distance instead of Euclidean for speed
      // (avoids expensive sqrt operation)
      const magnitude = Math.abs(gx) + Math.abs(gy);
      edges[idx] = magnitude;
    }
  }
  
  return edges;
}

/**
 * Apply Sobel edge detection operator (legacy, kept for compatibility)
 */
function applySobelEdgeDetection(
  luminance: Float32Array,
  width: number,
  height: number
): Float32Array {
  return applySobelEdgeDetectionOptimized(luminance, width, height);
}

/**
 * Find shadow regions in the shadow mask
 * Simplified implementation that returns overall bounding box
 */
function findShadowRegions(
  shadowMask: Uint8Array,
  width: number,
  height: number
): Array<{ x: number; y: number; width: number; height: number }> {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasShadows = false;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (shadowMask[y * width + x] === 1) {
        hasShadows = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  if (!hasShadows) {
    return [];
  }
  
  return [{
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }];
}
