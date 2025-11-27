/**
 * Hazard Classifier
 * Rule-based hazard detection using edge density, texture analysis, and depth estimation
 */

import { BrightnessHistogram } from '../sensor-fusion/brightness-histogram';
import { HazardDetection } from './index';

/**
 * Detect hazards in a camera frame
 * Uses rule-based classification with edge density, texture analysis, and depth estimation
 * 
 * @param frame - Camera frame to analyze
 * @param histogram - Pre-computed brightness histogram
 * @returns Array of detected hazards
 */
export function detectHazards(
  frame: ImageData,
  histogram: BrightnessHistogram
): HazardDetection[] {
  const hazards: HazardDetection[] = [];

  // Compute edge density map
  const edgeDensity = computeEdgeDensity(frame);
  
  // Compute texture features
  const textureMap = computeTextureFeatures(frame);
  
  // Detect obstacles using edge density
  const obstacles = detectObstacles(edgeDensity, frame.width, frame.height);
  hazards.push(...obstacles);
  
  // Detect uneven surfaces using texture analysis
  const unevenSurfaces = detectUnevenSurfaces(textureMap, frame.width, frame.height);
  hazards.push(...unevenSurfaces);
  
  // Detect drop-offs using depth estimation heuristics
  const dropOffs = detectDropOffs(frame, histogram);
  hazards.push(...dropOffs);

  return hazards;
}

/**
 * Compute edge density using Sobel operator
 * Optimized with downsampling for performance
 */
function computeEdgeDensity(frame: ImageData): Float32Array {
  const width = frame.width;
  const height = frame.height;
  
  // Downsample by 2x for performance (process every other pixel)
  const downWidth = Math.floor(width / 2);
  const downHeight = Math.floor(height / 2);
  const edgeDensity = new Float32Array(downWidth * downHeight);

  // Convert to grayscale with downsampling
  const gray = new Float32Array(downWidth * downHeight);
  for (let y = 0; y < downHeight; y++) {
    for (let x = 0; x < downWidth; x++) {
      const srcIdx = ((y * 2) * width + (x * 2)) * 4;
      const r = frame.data[srcIdx];
      const g = frame.data[srcIdx + 1];
      const b = frame.data[srcIdx + 2];
      gray[y * downWidth + x] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }

  // Apply Sobel operator on downsampled image
  for (let y = 1; y < downHeight - 1; y++) {
    for (let x = 1; x < downWidth - 1; x++) {
      // Simplified Sobel using only horizontal and vertical differences
      const idx = y * downWidth + x;
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + downWidth] - gray[idx - downWidth];
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edgeDensity[idx] = magnitude;
    }
  }

  return edgeDensity;
}

/**
 * Compute texture features using local variance
 * Optimized with downsampling and smaller windows
 */
function computeTextureFeatures(frame: ImageData): Float32Array {
  const width = frame.width;
  const height = frame.height;
  
  // Downsample by 4x for performance
  const downWidth = Math.floor(width / 4);
  const downHeight = Math.floor(height / 4);
  const textureMap = new Float32Array(downWidth * downHeight);

  // Convert to grayscale with downsampling
  const gray = new Float32Array(downWidth * downHeight);
  for (let y = 0; y < downHeight; y++) {
    for (let x = 0; x < downWidth; x++) {
      const srcIdx = ((y * 4) * width + (x * 4)) * 4;
      const r = frame.data[srcIdx];
      const g = frame.data[srcIdx + 1];
      const b = frame.data[srcIdx + 2];
      gray[y * downWidth + x] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }

  // Compute local variance in 3x3 windows (smaller for performance)
  const windowSize = 3;
  const halfWindow = 1;

  for (let y = halfWindow; y < downHeight - halfWindow; y++) {
    for (let x = halfWindow; x < downWidth - halfWindow; x++) {
      let sum = 0;
      let sumSq = 0;
      const count = 9; // 3x3 window

      for (let wy = -halfWindow; wy <= halfWindow; wy++) {
        for (let wx = -halfWindow; wx <= halfWindow; wx++) {
          const idx = (y + wy) * downWidth + (x + wx);
          const val = gray[idx];
          sum += val;
          sumSq += val * val;
        }
      }

      const mean = sum / count;
      const variance = (sumSq / count) - (mean * mean);
      textureMap[y * downWidth + x] = variance;
    }
  }

  return textureMap;
}

/**
 * Detect obstacles using edge density analysis
 * Optimized version with sampling and limited region growing
 * Note: edgeDensity is already downsampled by 2x
 */
function detectObstacles(
  edgeDensity: Float32Array,
  origWidth: number,
  origHeight: number
): HazardDetection[] {
  const hazards: HazardDetection[] = [];
  const width = Math.floor(origWidth / 2);
  const height = Math.floor(origHeight / 2);
  const threshold = 50; // Edge density threshold
  const minRegionSize = 25; // Minimum pixels for a hazard (adjusted for downsampling)
  const sampleStep = 4; // Sample every 4th pixel for performance

  // Simple region growing to find connected high-edge-density regions
  const visited = new Set<number>();

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const idx = y * width + x;
      
      if (visited.has(idx) || edgeDensity[idx] < threshold) {
        continue;
      }

      // Found a potential obstacle, grow the region (limited iterations)
      const region = growRegionLimited(edgeDensity, width, height, x, y, threshold, visited, 30);

      if (region.size >= minRegionSize / (sampleStep * sampleStep)) {
        const bbox = computeBoundingBox(region, width);
        // Scale bounding box back to original resolution
        bbox.x *= 2;
        bbox.y *= 2;
        bbox.width *= 2;
        bbox.height *= 2;
        
        const confidence = Math.min(1.0, region.size / (width * height * 0.1));

        hazards.push({
          id: `obstacle_${x * 2}_${y * 2}`,
          type: 'obstacle',
          confidence,
          boundingBox: bbox,
        });
      }
    }
  }

  return hazards;
}

/**
 * Detect uneven surfaces using texture analysis
 * Optimized version with sampling
 * Note: textureMap is already downsampled by 4x
 */
function detectUnevenSurfaces(
  textureMap: Float32Array,
  origWidth: number,
  origHeight: number
): HazardDetection[] {
  const hazards: HazardDetection[] = [];
  const width = Math.floor(origWidth / 4);
  const height = Math.floor(origHeight / 4);
  const threshold = 500; // Texture variance threshold
  const sampleStep = 4; // Sample every 4th pixel

  // Look for regions with high texture variance (indicating uneven surfaces)
  const visited = new Set<number>();

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const idx = y * width + x;
      
      if (visited.has(idx) || textureMap[idx] < threshold) {
        continue;
      }

      const region = growRegionLimited(textureMap, width, height, x, y, threshold, visited, 30);

      if (region.size >= 6 / (sampleStep * sampleStep)) { // Adjusted for 4x downsampling
        const bbox = computeBoundingBox(region, width);
        // Scale bounding box back to original resolution
        bbox.x *= 4;
        bbox.y *= 4;
        bbox.width *= 4;
        bbox.height *= 4;
        
        const confidence = Math.min(1.0, region.size / (width * height * 0.05));

        hazards.push({
          id: `uneven_${x * 4}_${y * 4}`,
          type: 'uneven_surface',
          confidence,
          boundingBox: bbox,
        });
      }
    }
  }

  return hazards;
}

/**
 * Detect drop-offs using depth estimation heuristics
 * Optimized version with aggressive sampling and integer arithmetic
 */
function detectDropOffs(
  frame: ImageData,
  histogram: BrightnessHistogram
): HazardDetection[] {
  const hazards: HazardDetection[] = [];
  const width = frame.width;
  const height = frame.height;
  const sampleStep = 16; // Increased sampling step for better performance
  const data = frame.data;

  // Simple heuristic: look for sudden brightness changes in the lower half of the frame
  // This could indicate a drop-off or edge
  const startY = Math.floor(height * 0.5);
  const endY = height - 10;
  const endX = width - 10;

  for (let y = startY; y < endY; y += sampleStep) {
    for (let x = 10; x < endX; x += sampleStep) {
      const idx = (y * width + x) * 4;
      const idxBelow = ((y + 10) * width + x) * 4;

      // Use integer arithmetic for performance
      const brightnessAbove = ((299 * data[idx] + 587 * data[idx + 1] + 114 * data[idx + 2]) / 1000) | 0;
      const brightnessBelow = ((299 * data[idxBelow] + 587 * data[idxBelow + 1] + 114 * data[idxBelow + 2]) / 1000) | 0;

      const diff = Math.abs(brightnessAbove - brightnessBelow);

      // Large brightness difference could indicate a drop-off
      if (diff > 100) {
        const confidence = Math.min(1.0, diff / 255);
        
        hazards.push({
          id: `dropoff_${x}_${y}`,
          type: 'drop_off',
          confidence,
          boundingBox: {
            x: Math.max(0, x - 20),
            y: Math.max(0, y - 10),
            width: 40,
            height: 20,
          },
        });
      }
    }
  }

  return hazards;
}

/**
 * Grow a region from a seed point with limited iterations
 * This prevents excessive computation on large regions
 */
function growRegionLimited(
  map: Float32Array,
  width: number,
  height: number,
  seedX: number,
  seedY: number,
  threshold: number,
  visited: Set<number>,
  maxIterations: number
): Set<number> {
  const region = new Set<number>();
  const queue: [number, number][] = [[seedX, seedY]];
  let iterations = 0;

  while (queue.length > 0 && iterations < maxIterations) {
    const [x, y] = queue.shift()!;
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height) {
      continue;
    }

    if (visited.has(idx) || map[idx] < threshold) {
      continue;
    }

    visited.add(idx);
    region.add(idx);
    iterations++;

    // Add neighbors
    queue.push([x + 1, y]);
    queue.push([x - 1, y]);
    queue.push([x, y + 1]);
    queue.push([x, y - 1]);
  }

  return region;
}

/**
 * Compute bounding box for a region
 */
function computeBoundingBox(region: Set<number>, width: number) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const idx of region) {
    const x = idx % width;
    const y = Math.floor(idx / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
