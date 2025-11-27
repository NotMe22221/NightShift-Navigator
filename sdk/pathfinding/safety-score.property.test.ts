/**
 * Property-Based Tests for Safety Score Computation
 * **Feature: nightshift-navigator, Property 13: Safety score computation**
 * **Validates: Requirements 3.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeSafetyScore } from './scoring';
import { NavigationEdge, Position } from './index';
import type { HazardDetection } from './scoring';

describe('Safety Score Computation Property Tests', () => {
  // Generator for positions
  const positionArbitrary = fc.record({
    latitude: fc.double({ min: -90, max: 90, noNaN: true }),
    longitude: fc.double({ min: -180, max: 180, noNaN: true }),
  });

  // Generator for navigation edges
  const edgeArbitrary = fc.record({
    id: fc.uuid(),
    fromNodeId: fc.uuid(),
    toNodeId: fc.uuid(),
    distance: fc.double({ min: 0, max: 10000, noNaN: true }),
    visibilityScore: fc.double({ min: 0, max: 1, noNaN: true }),
    safetyScore: fc.double({ min: 0, max: 1, noNaN: true }),
  });

  // Generator for hazard detections
  const hazardArbitrary = fc.record({
    id: fc.uuid(),
    type: fc.constantFrom('obstacle', 'uneven_surface', 'drop_off', 'unknown'),
    confidence: fc.double({ min: 0, max: 1, noNaN: true }),
    boundingBox: fc.record({
      x: fc.double({ min: 0, max: 1920, noNaN: true }),
      y: fc.double({ min: 0, max: 1080, noNaN: true }),
      width: fc.double({ min: 10, max: 500, noNaN: true }),
      height: fc.double({ min: 10, max: 500, noNaN: true }),
    }),
    worldPosition: fc.option(
      fc.record({
        latitude: fc.double({ min: -90, max: 90, noNaN: true }),
        longitude: fc.double({ min: -180, max: 180, noNaN: true }),
        distance: fc.double({ min: 0, max: 100, noNaN: true }),
      }),
      { nil: undefined }
    ),
  });

  it('Property 13: For any path segment with hazard data, safety score should be between 0 and 1', () => {
    fc.assert(
      fc.property(
        edgeArbitrary,
        positionArbitrary,
        positionArbitrary,
        fc.array(hazardArbitrary, { maxLength: 20 }),
        (edge, fromPos, toPos, hazards) => {
          const score = computeSafetyScore(
            edge as NavigationEdge,
            fromPos as Position,
            toPos as Position,
            hazards as HazardDetection[]
          );
          
          return score >= 0 && score <= 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13 (variant): Safety score should decrease as hazard density increases', () => {
    fc.assert(
      fc.property(
        edgeArbitrary,
        positionArbitrary,
        positionArbitrary,
        fc.array(hazardArbitrary, { minLength: 1, maxLength: 5 }),
        (edge, fromPos, toPos, baseHazards) => {
          // Create two scenarios: fewer hazards vs more hazards
          const hazards1 = baseHazards.slice(0, Math.max(1, Math.floor(baseHazards.length / 2)));
          const hazards2 = baseHazards;
          
          // Ensure all hazards have world positions near the edge
          const hazardsWithPos1 = hazards1.map((h) => ({
            ...h,
            worldPosition: {
              latitude: (fromPos as Position).latitude + (Math.random() - 0.5) * 0.0001,
              longitude: (fromPos as Position).longitude + (Math.random() - 0.5) * 0.0001,
              distance: 10,
            },
          }));
          
          const hazardsWithPos2 = hazards2.map((h) => ({
            ...h,
            worldPosition: {
              latitude: (fromPos as Position).latitude + (Math.random() - 0.5) * 0.0001,
              longitude: (fromPos as Position).longitude + (Math.random() - 0.5) * 0.0001,
              distance: 10,
            },
          }));
          
          const score1 = computeSafetyScore(
            edge as NavigationEdge,
            fromPos as Position,
            toPos as Position,
            hazardsWithPos1 as HazardDetection[]
          );
          
          const score2 = computeSafetyScore(
            edge as NavigationEdge,
            fromPos as Position,
            toPos as Position,
            hazardsWithPos2 as HazardDetection[]
          );
          
          // Fewer hazards should give higher or equal safety score
          return score1 >= score2;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13 (edge case): No hazards should give maximum safety score', () => {
    fc.assert(
      fc.property(
        edgeArbitrary,
        positionArbitrary,
        positionArbitrary,
        (edge, fromPos, toPos) => {
          const score = computeSafetyScore(
            edge as NavigationEdge,
            fromPos as Position,
            toPos as Position,
            []
          );
          
          // Should be 1.0 when no hazards
          return score === 1.0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13 (edge case): Hazards without world positions should be ignored', () => {
    fc.assert(
      fc.property(
        edgeArbitrary,
        positionArbitrary,
        positionArbitrary,
        fc.array(hazardArbitrary, { minLength: 1, maxLength: 10 }),
        (edge, fromPos, toPos, hazards) => {
          // Remove world positions from all hazards
          const hazardsWithoutPos = hazards.map((h) => ({
            ...h,
            worldPosition: undefined,
          }));
          
          const score = computeSafetyScore(
            edge as NavigationEdge,
            fromPos as Position,
            toPos as Position,
            hazardsWithoutPos as HazardDetection[]
          );
          
          // Should be 1.0 when no hazards have positions
          return score === 1.0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13 (edge case): Distant hazards should not affect safety score', () => {
    fc.assert(
      fc.property(
        edgeArbitrary,
        positionArbitrary,
        positionArbitrary,
        fc.array(hazardArbitrary, { minLength: 1, maxLength: 10 }),
        (edge, fromPos, toPos, hazards) => {
          // Place all hazards far away (> 20m threshold)
          const distantHazards = hazards.map((h) => ({
            ...h,
            worldPosition: {
              latitude: (fromPos as Position).latitude + 1, // ~111km away
              longitude: (fromPos as Position).longitude + 1,
              distance: 100000,
            },
          }));
          
          const score = computeSafetyScore(
            edge as NavigationEdge,
            fromPos as Position,
            toPos as Position,
            distantHazards as HazardDetection[]
          );
          
          // Should be 1.0 when all hazards are far away
          return score === 1.0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13 (variant): Higher confidence hazards should reduce safety more', () => {
    fc.assert(
      fc.property(
        edgeArbitrary,
        positionArbitrary,
        positionArbitrary,
        hazardArbitrary,
        (edge, fromPos, toPos, baseHazard) => {
          // Create two hazards: low confidence and high confidence
          const lowConfidenceHazard = {
            ...baseHazard,
            confidence: 0.3,
            worldPosition: {
              latitude: (fromPos as Position).latitude,
              longitude: (fromPos as Position).longitude,
              distance: 10,
            },
          };
          
          const highConfidenceHazard = {
            ...baseHazard,
            confidence: 0.9,
            worldPosition: {
              latitude: (fromPos as Position).latitude,
              longitude: (fromPos as Position).longitude,
              distance: 10,
            },
          };
          
          const scoreLowConf = computeSafetyScore(
            edge as NavigationEdge,
            fromPos as Position,
            toPos as Position,
            [lowConfidenceHazard as HazardDetection]
          );
          
          const scoreHighConf = computeSafetyScore(
            edge as NavigationEdge,
            fromPos as Position,
            toPos as Position,
            [highConfidenceHazard as HazardDetection]
          );
          
          // Low confidence should give higher or equal safety score
          return scoreLowConf >= scoreHighConf;
        }
      ),
      { numRuns: 100 }
    );
  });
});
