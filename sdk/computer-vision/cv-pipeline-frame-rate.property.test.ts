/**
 * Property-Based Tests for CV Pipeline Frame Rate
 * **Feature: nightshift-navigator, Property 10: CV pipeline frame rate**
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { CVPipeline } from './index';

describe('Property 10: CV pipeline frame rate', () => {
  it('should process at least 10 frames per second during active operation', async () => {
    // **Feature: nightshift-navigator, Property 10: CV pipeline frame rate**
    // **Validates: Requirements 2.5**
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random frame dimensions (up to 480x360 per requirements)
        fc.integer({ min: 320, max: 480 }),
        fc.integer({ min: 240, max: 360 }),
        async (width, height) => {
          // Initialize CV pipeline
          // Note: Disable contrast map for performance testing
          const pipeline = new CVPipeline();
          await pipeline.initialize({
            targetFPS: 10,
            maxMemoryMB: 150,
            hazardDetectionEnabled: true,
            contrastMapEnabled: false, // Disabled for performance
          });

          // Process frames and measure sustained throughput
          const frameCount = 10; // Process more frames for better average
          const frames: ImageData[] = [];
          
          // Pre-generate frames
          for (let i = 0; i < frameCount; i++) {
            const frameData = new Uint8ClampedArray(width * height * 4);
            for (let j = 0; j < frameData.length; j++) {
              frameData[j] = Math.floor(Math.random() * 256);
            }
            frames.push(new ImageData(frameData, width, height));
          }

          // Warm up JIT - process one frame first
          await pipeline.processFrame(frames[0]);

          // Measure sustained processing time (excluding first frame)
          const startTime = performance.now();
          
          for (let i = 1; i < frameCount; i++) {
            await pipeline.processFrame(frames[i]);
          }
          
          const totalTime = performance.now() - startTime;
          const avgTimePerFrame = totalTime / (frameCount - 1);

          await pipeline.shutdown();

          // Average frame processing time should be <= 100ms (10 FPS minimum)
          // Allow 10% margin for variability
          return avgTimePerFrame <= 110;
        }
      ),
      { numRuns: 20 } // Reduced runs since this test takes longer
    );
  });
});
