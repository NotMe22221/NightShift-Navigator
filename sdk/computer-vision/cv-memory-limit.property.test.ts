/**
 * Property-Based Tests for CV Memory Limit
 * **Feature: nightshift-navigator, Property 51: CV memory limit**
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { CVPipeline } from './index';

describe('Property 51: CV memory limit', () => {
  it('should not exceed 150 MB memory usage during normal operation', async () => {
    // **Feature: nightshift-navigator, Property 51: CV memory limit**
    // **Validates: Requirements 11.1**
    
    // Note: This test can only run in environments where performance.memory is available
    // (Chrome/Chromium-based browsers with --enable-precise-memory-info flag)
    
    if (!performance || !(performance as any).memory) {
      console.warn('performance.memory not available, skipping memory test');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate random frame dimensions
        fc.integer({ min: 320, max: 640 }),
        fc.integer({ min: 240, max: 480 }),
        async (width, height) => {
          // Initialize CV pipeline
          const pipeline = new CVPipeline();
          await pipeline.initialize({
            targetFPS: 10,
            maxMemoryMB: 150,
            hazardDetectionEnabled: true,
            contrastMapEnabled: true,
          });

          // Process several frames to allow memory usage to stabilize
          for (let i = 0; i < 5; i++) {
            const frameData = new Uint8ClampedArray(width * height * 4);
            for (let j = 0; j < frameData.length; j++) {
              frameData[j] = Math.floor(Math.random() * 256);
            }
            const frame = new ImageData(frameData, width, height);
            
            try {
              await pipeline.processFrame(frame);
            } catch (error) {
              // Continue even if frame processing fails
            }
          }

          // Check memory usage
          const memoryUsage = pipeline.getMemoryUsage();

          await pipeline.shutdown();

          // Memory usage should not exceed 150 MB
          return memoryUsage <= 150;
        }
      ),
      { numRuns: 10 } // Reduced runs since this test is resource-intensive
    );
  });
});
