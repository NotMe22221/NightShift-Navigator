/**
 * Property-Based Tests for Graph Incorporation Performance
 * 
 * **Feature: nightshift-navigator, Property 33: Graph incorporation performance**
 * **Validates: Requirements 7.3**
 * 
 * Property: For any valid map data submission, the data should be incorporated 
 * into the navigation graph within 5 seconds.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PluginAPI, MapDataSubmission } from './index';
import { GraphBuilder } from '../pathfinding';
import { GeoJSONFeatureCollection } from '../pathfinding/geojson-parser';

describe('Property 33: Graph incorporation performance', () => {
  let pluginAPI: PluginAPI;
  let graphBuilder: GraphBuilder;

  beforeEach(() => {
    graphBuilder = new GraphBuilder();
    pluginAPI = new PluginAPI(
      {
        authenticationRequired: false,
        maxDataSizeMB: 10,
        conflictResolution: 'merge',
      },
      graphBuilder
    );
  });

  // Generator for valid coordinates
  const validCoordinate = fc.tuple(
    fc.double({ min: -180, max: 180 }), // longitude
    fc.double({ min: -90, max: 90 })    // latitude
  );

  // Generator for valid Point geometry
  const validPointGeometry = fc.record({
    type: fc.constant('Point' as const),
    coordinates: validCoordinate,
  });

  // Generator for valid LineString geometry
  const validLineStringGeometry = fc.record({
    type: fc.constant('LineString' as const),
    coordinates: fc.array(validCoordinate, { minLength: 2, maxLength: 10 }),
  });

  // Generator for valid Feature
  const validFeature = fc.oneof(
    fc.record({
      type: fc.constant('Feature' as const),
      geometry: validPointGeometry,
      properties: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
    }),
    fc.record({
      type: fc.constant('Feature' as const),
      geometry: validLineStringGeometry,
      properties: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
    })
  );

  // Generator for valid GeoJSON FeatureCollection with varying sizes
  const validGeoJSON = fc.record({
    type: fc.constant('FeatureCollection' as const),
    features: fc.array(validFeature, { minLength: 1, maxLength: 100 }),
  });

  it('should incorporate valid map data within 5 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(validGeoJSON, async (geoJSON) => {
        const submission: MapDataSubmission = {
          format: 'geojson',
          data: geoJSON as GeoJSONFeatureCollection,
          priority: 5,
          source: 'test-app',
          timestamp: Date.now(),
        };

        const startTime = Date.now();
        const result = await pluginAPI.submitMapData(submission);
        const endTime = Date.now();
        const incorporationTime = endTime - startTime;

        // Should complete within 5 seconds (5000ms)
        expect(incorporationTime).toBeLessThan(5000);
        
        // Should be successful
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should incorporate data and return accurate statistics', async () => {
    await fc.assert(
      fc.asyncProperty(validGeoJSON, async (geoJSON) => {
        // Create fresh instances for each property test iteration to avoid deduplication
        const localGraphBuilder = new GraphBuilder();
        const localPluginAPI = new PluginAPI(
          {
            authenticationRequired: false,
            maxDataSizeMB: 10,
            conflictResolution: 'merge',
          },
          localGraphBuilder
        );

        const submission: MapDataSubmission = {
          format: 'geojson',
          data: geoJSON as GeoJSONFeatureCollection,
          priority: 5,
          source: 'test-app',
          timestamp: Date.now(),
        };

        const result = await localPluginAPI.submitMapData(submission);

        // Should be successful
        expect(result.success).toBe(true);
        
        // Should report nodes and edges added
        expect(result.nodesAdded).toBeGreaterThanOrEqual(0);
        expect(result.edgesAdded).toBeGreaterThanOrEqual(0);
        
        // For valid data with features, at least some nodes should be added
        // Note: Point geometries create nodes but no edges, LineStrings create both
        if (geoJSON.features.length > 0) {
          expect(result.nodesAdded).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle large datasets efficiently', async () => {
    // Generate a larger dataset
    const largeGeoJSON = fc.record({
      type: fc.constant('FeatureCollection' as const),
      features: fc.array(validFeature, { minLength: 50, maxLength: 200 }),
    });

    await fc.assert(
      fc.asyncProperty(largeGeoJSON, async (geoJSON) => {
        const submission: MapDataSubmission = {
          format: 'geojson',
          data: geoJSON as GeoJSONFeatureCollection,
          priority: 5,
          source: 'test-app',
          timestamp: Date.now(),
        };

        const startTime = Date.now();
        const result = await pluginAPI.submitMapData(submission);
        const endTime = Date.now();
        const incorporationTime = endTime - startTime;

        // Even large datasets should complete within 5 seconds
        expect(incorporationTime).toBeLessThan(5000);
        expect(result.success).toBe(true);
      }),
      { numRuns: 50 } // Fewer runs for larger datasets
    );
  });

  it('should maintain performance across multiple submissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validGeoJSON, { minLength: 3, maxLength: 5 }),
        async (geoJSONArray) => {
          const times: number[] = [];

          for (const geoJSON of geoJSONArray) {
            const submission: MapDataSubmission = {
              format: 'geojson',
              data: geoJSON as GeoJSONFeatureCollection,
              priority: 5,
              source: 'test-app',
              timestamp: Date.now(),
            };

            const startTime = Date.now();
            const result = await pluginAPI.submitMapData(submission);
            const endTime = Date.now();
            const incorporationTime = endTime - startTime;

            times.push(incorporationTime);
            expect(result.success).toBe(true);
          }

          // All submissions should complete within 5 seconds
          for (const time of times) {
            expect(time).toBeLessThan(5000);
          }
        }
      ),
      { numRuns: 20 } // Fewer runs since we're doing multiple submissions per run
    );
  });

  it('should incorporate data with different conflict resolution strategies within time limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        validGeoJSON,
        fc.constantFrom('priority', 'merge', 'reject'),
        async (geoJSON, conflictResolution) => {
          const localGraphBuilder = new GraphBuilder();
          const localPluginAPI = new PluginAPI(
            {
              authenticationRequired: false,
              maxDataSizeMB: 10,
              conflictResolution: conflictResolution as 'priority' | 'merge' | 'reject',
            },
            localGraphBuilder
          );

          const submission: MapDataSubmission = {
            format: 'geojson',
            data: geoJSON as GeoJSONFeatureCollection,
            priority: 5,
            source: 'test-app',
            timestamp: Date.now(),
          };

          const startTime = Date.now();
          const result = await localPluginAPI.submitMapData(submission);
          const endTime = Date.now();
          const incorporationTime = endTime - startTime;

          // Should complete within 5 seconds regardless of conflict resolution strategy
          expect(incorporationTime).toBeLessThan(5000);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should report incorporation time in success message', async () => {
    await fc.assert(
      fc.asyncProperty(validGeoJSON, async (geoJSON) => {
        const submission: MapDataSubmission = {
          format: 'geojson',
          data: geoJSON as GeoJSONFeatureCollection,
          priority: 5,
          source: 'test-app',
          timestamp: Date.now(),
        };

        const result = await pluginAPI.submitMapData(submission);

        if (result.success) {
          // Success message should include timing information
          expect(result.message).toContain('ms');
          expect(result.message.toLowerCase()).toContain('successfully');
        }
      }),
      { numRuns: 100 }
    );
  });
});
