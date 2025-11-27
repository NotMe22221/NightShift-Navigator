/**
 * Property-Based Tests for Visibility Score Computation
 * **Feature: nightshift-navigator, Property 12: Visibility score computation**
 * **Validates: Requirements 3.2**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeVisibilityScore } from './scoring';
import { NavigationEdge } from './index';
import type { LightMetrics } from './scoring';

describe('Visibility Score Computation Property Tests', () => {
  // Generator for navigation edges
  const edgeArbitrary = fc.record({
    id: fc.uuid(),
    fromNodeId: fc.uuid(),
    toNodeId: fc.uuid(),
    distance: fc.double({ min: 0, max: 10000 }),
    visibilityScore: fc.double({ min: 0, max: 1 }),
    safetyScore: fc.double({ min: 0, max: 1 }),
  });

  // Generator for light metrics
  const lightMetricsArbitrary = fc.record({
    meanLuminance: fc.double({ min: 0, max: 255, noNaN: true }),
    ambientLux: fc.double({ min: 0, max: 100000, noNaN: true }),
    shadowCoverage: fc.double({ min: 0, max: 1, noNaN: true }),
    unifiedLightLevel: fc.double({ min: 0, max: 1, noNaN: true }),
    timestamp: fc.integer({ min: 0 }),
  });

  it('Property 12: For any path segment with light metrics, visibility score should be between 0 and 1', () => {
    fc.assert(
      fc.property(
        edgeArbitrary,
        lightMetricsArbitrary,
        (edge, lightMetrics) => {
          const score = computeVisibilityScore(
            edge as NavigationEdge,
            lightMetrics as LightMetrics
          );
          
          return score >= 0 && score <= 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12 (variant): Visibility score should decrease as light levels decrease', () => {
    fc.assert(
      fc.property(
        edgeArbitrary,
        fc.double({ min: 0.1, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 255, noNaN: true }),
        fc.double({ min: 0, max: 100000, noNaN: true }),
        fc.integer({ min: 0 }),
        (edge, lightLevel1, shadowCoverage, meanLuminance, ambientLux, timestamp) => {
          // Ensure lightLevel1 > lightLevel2
          const lightLevel2 = lightLevel1 * 0.5;
          
          const metrics1: LightMetrics = {
            meanLuminance,
            ambientLux,
            shadowCoverage,
            unifiedLightLevel: lightLevel1,
            timestamp,
          };
          
          const metrics2: LightMetrics = {
            meanLuminance,
            ambientLux,
            shadowCoverage,
            unifiedLightLevel: lightLevel2,
            timestamp,
          };
          
          const score1 = computeVisibilityScore(edge as NavigationEdge, metrics1);
          const score2 = computeVisibilityScore(edge as NavigationEdge, metrics2);
          
          // Higher light level should give higher or equal visibility score
          return score1 >= score2;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12 (variant): Visibility score should decrease as shadow coverage increases', () => {
    fc.assert(
      fc.property(
        edgeArbitrary,
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 0.7, noNaN: true }),
        fc.double({ min: 0, max: 255, noNaN: true }),
        fc.double({ min: 0, max: 100000, noNaN: true }),
        fc.integer({ min: 0 }),
        (edge, unifiedLightLevel, shadowCoverage1, meanLuminance, ambientLux, timestamp) => {
          // Ensure shadowCoverage2 > shadowCoverage1
          const shadowCoverage2 = Math.min(1, shadowCoverage1 + 0.3);
          
          const metrics1: LightMetrics = {
            meanLuminance,
            ambientLux,
            shadowCoverage: shadowCoverage1,
            unifiedLightLevel,
            timestamp,
          };
          
          const metrics2: LightMetrics = {
            meanLuminance,
            ambientLux,
            shadowCoverage: shadowCoverage2,
            unifiedLightLevel,
            timestamp,
          };
          
          const score1 = computeVisibilityScore(edge as NavigationEdge, metrics1);
          const score2 = computeVisibilityScore(edge as NavigationEdge, metrics2);
          
          // Lower shadow coverage should give higher or equal visibility score
          return score1 >= score2;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12 (edge case): Maximum light with no shadows should give high visibility', () => {
    fc.assert(
      fc.property(edgeArbitrary, (edge) => {
        const maxLightMetrics: LightMetrics = {
          meanLuminance: 255,
          ambientLux: 100000,
          shadowCoverage: 0,
          unifiedLightLevel: 1.0,
          timestamp: Date.now(),
        };
        
        const score = computeVisibilityScore(edge as NavigationEdge, maxLightMetrics);
        
        // Should be close to 1.0
        return score >= 0.9 && score <= 1.0;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 12 (edge case): Minimum light should give low visibility', () => {
    fc.assert(
      fc.property(edgeArbitrary, (edge) => {
        const minLightMetrics: LightMetrics = {
          meanLuminance: 0,
          ambientLux: 0,
          shadowCoverage: 0,
          unifiedLightLevel: 0,
          timestamp: Date.now(),
        };
        
        const score = computeVisibilityScore(edge as NavigationEdge, minLightMetrics);
        
        // Should be close to 0
        return score >= 0 && score <= 0.1;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 12 (edge case): Complete shadow coverage should reduce visibility', () => {
    fc.assert(
      fc.property(
        edgeArbitrary,
        fc.double({ min: 0.5, max: 1, noNaN: true }),
        (edge, unifiedLightLevel) => {
          const noShadowMetrics: LightMetrics = {
            meanLuminance: 128,
            ambientLux: 50000,
            shadowCoverage: 0,
            unifiedLightLevel,
            timestamp: Date.now(),
          };
          
          const fullShadowMetrics: LightMetrics = {
            meanLuminance: 128,
            ambientLux: 50000,
            shadowCoverage: 1.0,
            unifiedLightLevel,
            timestamp: Date.now(),
          };
          
          const scoreNoShadow = computeVisibilityScore(edge as NavigationEdge, noShadowMetrics);
          const scoreFullShadow = computeVisibilityScore(edge as NavigationEdge, fullShadowMetrics);
          
          // No shadow should give higher visibility than full shadow
          return scoreNoShadow > scoreFullShadow;
        }
      ),
      { numRuns: 100 }
    );
  });
});
