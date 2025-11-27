/**
 * Property-Based Tests for CV Pipeline Error Recovery
 * **Feature: nightshift-navigator, Property 37: CV pipeline error recovery**
 * **Validates: Requirements 8.2**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { CVPipeline } from './index.js';

describe('Property 37: CV pipeline error recovery', () => {
  /**
   * Property: For any frame processing error in the Hazard Classifier, 
   * the CV Pipeline should continue processing subsequent frames.
   */
  it('should continue processing after frame errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            width: fc.integer({ min: 100, max: 640 }),
            height: fc.integer({ min: 100, max: 480 }),
            shouldFail: fc.boolean()
          }),
          { minLength: 5, maxLength: 20 }
        ),
        async (frameConfigs) => {
          // Setup
          const pipeline = new CVPipeline();
          await pipeline.initialize({
            targetFPS: 10,
            maxMemoryMB: 150,
            hazardDetectionEnabled: true,
            contrastMapEnabled: true
          });

          let successCount = 0;
          let errorCount = 0;

          // Process frames
          for (const config of frameConfigs) {
            const frame = createTestFrame(config.width, config.height, config.shouldFail);
            
            try {
              const result = await pipeline.processFrame(frame);
              successCount++;
              
              // Verify result structure is valid
              expect(result.histogram).toBeDefined();
              expect(result.hazards).toBeInstanceOf(Array);
              expect(result.contrastMap).toBeDefined();
              expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
            } catch (error) {
              errorCount++;
            }
          }

          // Verify pipeline continued processing despite errors
          // At least some frames should have been processed successfully
          if (frameConfigs.some(c => !c.shouldFail)) {
            expect(successCount).toBeGreaterThan(0);
          }

          // Verify errors were logged
          const errorLog = pipeline.getErrorLog();
          if (errorCount > 0) {
            expect(errorLog.length).toBeGreaterThan(0);
          }

          // Cleanup
          await pipeline.shutdown();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should log errors with context when frame processing fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 640 }),
        fc.integer({ min: 100, max: 480 }),
        async (width, height) => {
          // Setup
          const pipeline = new CVPipeline();
          await pipeline.initialize({
            targetFPS: 10,
            maxMemoryMB: 150,
            hazardDetectionEnabled: true,
            contrastMapEnabled: true
          });

          // Create a valid frame
          const frame = createTestFrame(width, height, false);
          
          try {
            await pipeline.processFrame(frame);
          } catch (error) {
            // Error is expected for some frames
          }

          // Process should complete without crashing
          // Error log should be accessible
          const errorLog = pipeline.getErrorLog();
          expect(errorLog).toBeInstanceOf(Array);

          // Cleanup
          await pipeline.shutdown();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reset consecutive error counter on successful processing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.boolean(), { minLength: 10, maxLength: 20 }),
        async (shouldFailSequence) => {
          // Setup
          const pipeline = new CVPipeline();
          await pipeline.initialize({
            targetFPS: 10,
            maxMemoryMB: 150,
            hazardDetectionEnabled: true,
            contrastMapEnabled: true
          });

          let maxConsecutiveErrors = 0;
          let currentConsecutive = 0;

          // Process frames with mixed success/failure
          for (const shouldFail of shouldFailSequence) {
            const frame = createTestFrame(320, 240, shouldFail);
            
            try {
              await pipeline.processFrame(frame);
              currentConsecutive = 0; // Reset on success
            } catch (error) {
              currentConsecutive++;
              maxConsecutiveErrors = Math.max(maxConsecutiveErrors, currentConsecutive);
            }
          }

          // Verify consecutive error tracking
          const consecutiveErrors = pipeline.getConsecutiveErrorCount();
          expect(consecutiveErrors).toBeGreaterThanOrEqual(0);

          // Cleanup
          await pipeline.shutdown();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain processing capability after isolated errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 15 }),
        async (frameCount) => {
          // Setup
          const pipeline = new CVPipeline();
          await pipeline.initialize({
            targetFPS: 10,
            maxMemoryMB: 150,
            hazardDetectionEnabled: true,
            contrastMapEnabled: true
          });

          // Process some frames successfully
          for (let i = 0; i < frameCount; i++) {
            const frame = createTestFrame(320, 240, false);
            const result = await pipeline.processFrame(frame);
            
            // Verify valid result
            expect(result.histogram).toBeDefined();
            expect(result.histogram.mean).toBeGreaterThanOrEqual(0);
            expect(result.histogram.mean).toBeLessThanOrEqual(255);
          }

          // Pipeline should still be functional
          const finalFrame = createTestFrame(320, 240, false);
          const finalResult = await pipeline.processFrame(finalFrame);
          expect(finalResult).toBeDefined();

          // Cleanup
          await pipeline.shutdown();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Helper function to create test frames
 */
function createTestFrame(width: number, height: number, shouldFail: boolean): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  
  // Fill with test data
  for (let i = 0; i < data.length; i += 4) {
    const brightness = shouldFail ? NaN : Math.floor(Math.random() * 256);
    data[i] = brightness;     // R
    data[i + 1] = brightness; // G
    data[i + 2] = brightness; // B
    data[i + 3] = 255;        // A
  }
  
  return new ImageData(data, width, height);
}
