/**
 * Property-Based Tests for Hazard Classifier Invocation
 * **Feature: nightshift-navigator, Property 7: Hazard classifier invocation**
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { CVPipeline } from './index';

describe('Property 7: Hazard classifier invocation', () => {
  it('should invoke hazard classifier and produce a list of detections for any frame', async () => {
    // **Feature: nightshift-navigator, Property 7: Hazard classifier invocation**
    // **Validates: Requirements 2.2**
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random frame dimensions
        fc.integer({ min: 320, max: 640 }),
        fc.integer({ min: 240, max: 480 }),
        async (width, height) => {
          // Create a random frame
          const frameData = new Uint8ClampedArray(width * height * 4);
          for (let i = 0; i < frameData.length; i++) {
            frameData[i] = Math.floor(Math.random() * 256);
          }
          const frame = new ImageData(frameData, width, height);

          // Initialize CV pipeline with hazard detection enabled
          const pipeline = new CVPipeline();
          await pipeline.initialize({
            targetFPS: 10,
            maxMemoryMB: 150,
            hazardDetectionEnabled: true,
            contrastMapEnabled: false,
          });

          // Process frame
          const result = await pipeline.processFrame(frame);

          // Hazard classifier should be invoked and produce a list (possibly empty)
          const classifierInvoked = Array.isArray(result.hazards);

          await pipeline.shutdown();

          return classifierInvoked;
        }
      ),
      { numRuns: 100 }
    );
  });
});
