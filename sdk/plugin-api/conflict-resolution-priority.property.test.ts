/**
 * Property-Based Tests for Conflict Resolution by Priority
 * 
 * **Feature: nightshift-navigator, Property 35: Conflict resolution by priority**
 * **Validates: Requirements 7.5**
 * 
 * Property: For any conflicting map data submissions with different priorities, 
 * the higher-priority data should be retained in the graph.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PluginAPI, MapDataSubmission } from './index';
import { GraphBuilder } from '../pathfinding';
import { GeoJSONFeatureCollection } from '../pathfinding/geojson-parser';

describe('Property 35: Conflict resolution by priority', () => {
  // Generator for valid coordinates
  const validCoordinate = fc.tuple(
    fc.double({ min: -180, max: 180 }), // longitude
    fc.double({ min: -90, max: 90 })    // latitude
  );

  // Generator for a specific Point at a fixed location (to create conflicts)
  const fixedPointFeature = (lon: number, lat: number, properties?: any) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [lon, lat] as [number, number],
    },
    properties: properties || {},
  });

  // Generator for a LineString connecting two points (to create edge conflicts)
  const fixedLineStringFeature = (
    lon1: number,
    lat1: number,
    lon2: number,
    lat2: number,
    properties?: any
  ) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [lon1, lat1] as [number, number],
        [lon2, lat2] as [number, number],
      ],
    },
    properties: properties || {},
  });

  it('should retain higher priority data when conflicts occur', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }), // priority1
        fc.integer({ min: 0, max: 10 }), // priority2
        fc.double({ min: -180, max: 180 }), // longitude
        fc.double({ min: -90, max: 90 }), // latitude
        async (priority1, priority2, lon, lat) => {
          // Skip if priorities are equal
          if (priority1 === priority2) return;

          const graphBuilder = new GraphBuilder();
          const pluginAPI = new PluginAPI(
            {
              authenticationRequired: false,
              maxDataSizeMB: 10,
              conflictResolution: 'priority',
            },
            graphBuilder
          );

          // Create two submissions with the same node but different priorities
          const submission1: MapDataSubmission = {
            format: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [fixedPointFeature(lon, lat, { source: 'submission1' })],
            } as GeoJSONFeatureCollection,
            priority: priority1,
            source: 'app1',
            timestamp: Date.now(),
          };

          const submission2: MapDataSubmission = {
            format: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [fixedPointFeature(lon, lat, { source: 'submission2' })],
            } as GeoJSONFeatureCollection,
            priority: priority2,
            source: 'app2',
            timestamp: Date.now() + 1,
          };

          // Submit both
          await pluginAPI.submitMapData(submission1);
          await pluginAPI.submitMapData(submission2);

          // Get the node ID
          const nodeId = `node_${lon.toFixed(6)}_${lat.toFixed(6)}`;
          const metadata = pluginAPI.getSubmissionMetadata(nodeId);

          // The metadata should reflect the higher priority submission
          expect(metadata).toBeDefined();
          if (metadata) {
            const higherPriority = Math.max(priority1, priority2);
            expect(metadata.priority).toBe(higherPriority);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not overwrite higher priority data with lower priority data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 10 }), // high priority
        fc.integer({ min: 0, max: 4 }), // low priority
        validCoordinate,
        async (highPriority, lowPriority, [lon, lat]) => {
          const graphBuilder = new GraphBuilder();
          const pluginAPI = new PluginAPI(
            {
              authenticationRequired: false,
              maxDataSizeMB: 10,
              conflictResolution: 'priority',
            },
            graphBuilder
          );

          // Submit high priority data first
          const highPrioritySubmission: MapDataSubmission = {
            format: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [fixedPointFeature(lon, lat, { priority: 'high' })],
            } as GeoJSONFeatureCollection,
            priority: highPriority,
            source: 'high-priority-app',
            timestamp: Date.now(),
          };

          await pluginAPI.submitMapData(highPrioritySubmission);

          // Try to submit low priority data for the same node
          const lowPrioritySubmission: MapDataSubmission = {
            format: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [fixedPointFeature(lon, lat, { priority: 'low' })],
            } as GeoJSONFeatureCollection,
            priority: lowPriority,
            source: 'low-priority-app',
            timestamp: Date.now() + 1,
          };

          await pluginAPI.submitMapData(lowPrioritySubmission);

          // Verify high priority data is retained
          const nodeId = `node_${lon.toFixed(6)}_${lat.toFixed(6)}`;
          const metadata = pluginAPI.getSubmissionMetadata(nodeId);

          expect(metadata).toBeDefined();
          if (metadata) {
            expect(metadata.priority).toBe(highPriority);
            expect(metadata.source).toBe('high-priority-app');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow lower priority data to be overwritten by higher priority data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 4 }), // low priority
        fc.integer({ min: 5, max: 10 }), // high priority
        validCoordinate,
        async (lowPriority, highPriority, [lon, lat]) => {
          const graphBuilder = new GraphBuilder();
          const pluginAPI = new PluginAPI(
            {
              authenticationRequired: false,
              maxDataSizeMB: 10,
              conflictResolution: 'priority',
            },
            graphBuilder
          );

          // Submit low priority data first
          const lowPrioritySubmission: MapDataSubmission = {
            format: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [fixedPointFeature(lon, lat, { priority: 'low' })],
            } as GeoJSONFeatureCollection,
            priority: lowPriority,
            source: 'low-priority-app',
            timestamp: Date.now(),
          };

          await pluginAPI.submitMapData(lowPrioritySubmission);

          // Submit high priority data for the same node
          const highPrioritySubmission: MapDataSubmission = {
            format: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [fixedPointFeature(lon, lat, { priority: 'high' })],
            } as GeoJSONFeatureCollection,
            priority: highPriority,
            source: 'high-priority-app',
            timestamp: Date.now() + 1,
          };

          await pluginAPI.submitMapData(highPrioritySubmission);

          // Verify high priority data replaced low priority data
          const nodeId = `node_${lon.toFixed(6)}_${lat.toFixed(6)}`;
          const metadata = pluginAPI.getSubmissionMetadata(nodeId);

          expect(metadata).toBeDefined();
          if (metadata) {
            expect(metadata.priority).toBe(highPriority);
            expect(metadata.source).toBe('high-priority-app');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge conflicts with priority resolution', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }), // priority1
        fc.integer({ min: 0, max: 10 }), // priority2
        async (priority1, priority2) => {
          // Skip if priorities are equal
          if (priority1 === priority2) return;

          const graphBuilder = new GraphBuilder();
          const pluginAPI = new PluginAPI(
            {
              authenticationRequired: false,
              maxDataSizeMB: 10,
              conflictResolution: 'priority',
            },
            graphBuilder
          );

          // Fixed coordinates for consistent edge IDs
          const lon1 = 0;
          const lat1 = 0;
          const lon2 = 1;
          const lat2 = 1;

          // Create two submissions with the same edge but different priorities
          const submission1: MapDataSubmission = {
            format: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [fixedLineStringFeature(lon1, lat1, lon2, lat2, { source: 'submission1' })],
            } as GeoJSONFeatureCollection,
            priority: priority1,
            source: 'app1',
            timestamp: Date.now(),
          };

          const submission2: MapDataSubmission = {
            format: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [fixedLineStringFeature(lon1, lat1, lon2, lat2, { source: 'submission2' })],
            } as GeoJSONFeatureCollection,
            priority: priority2,
            source: 'app2',
            timestamp: Date.now() + 1,
          };

          // Submit both
          await pluginAPI.submitMapData(submission1);
          await pluginAPI.submitMapData(submission2);

          // Get the edge ID
          const nodeId1 = `node_${lon1.toFixed(6)}_${lat1.toFixed(6)}`;
          const nodeId2 = `node_${lon2.toFixed(6)}_${lat2.toFixed(6)}`;
          const edgeId = `edge_${nodeId1}_${nodeId2}`;
          const metadata = pluginAPI.getSubmissionMetadata(edgeId);

          // The metadata should reflect the higher priority submission
          expect(metadata).toBeDefined();
          if (metadata) {
            const higherPriority = Math.max(priority1, priority2);
            expect(metadata.priority).toBe(higherPriority);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle reject mode by rejecting conflicting data', async () => {
    await fc.assert(
      fc.asyncProperty(validCoordinate, async ([lon, lat]) => {
        const graphBuilder = new GraphBuilder();
        const pluginAPI = new PluginAPI(
          {
            authenticationRequired: false,
            maxDataSizeMB: 10,
            conflictResolution: 'reject',
          },
          graphBuilder
        );

        // Submit first data
        const submission1: MapDataSubmission = {
          format: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [fixedPointFeature(lon, lat)],
          } as GeoJSONFeatureCollection,
          priority: 5,
          source: 'app1',
          timestamp: Date.now(),
        };

        const result1 = await pluginAPI.submitMapData(submission1);
        expect(result1.success).toBe(true);

        // Try to submit conflicting data
        const submission2: MapDataSubmission = {
          format: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [fixedPointFeature(lon, lat)],
          } as GeoJSONFeatureCollection,
          priority: 8,
          source: 'app2',
          timestamp: Date.now() + 1,
        };

        const result2 = await pluginAPI.submitMapData(submission2);
        
        // Second submission should be rejected due to conflict
        expect(result2.success).toBe(false);
        expect(result2.message.toLowerCase()).toContain('conflict');
      }),
      { numRuns: 100 }
    );
  });

  it('should handle merge mode by accepting all data', async () => {
    await fc.assert(
      fc.asyncProperty(
        validCoordinate,
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        async ([lon, lat], priority1, priority2) => {
          const graphBuilder = new GraphBuilder();
          const pluginAPI = new PluginAPI(
            {
              authenticationRequired: false,
              maxDataSizeMB: 10,
              conflictResolution: 'merge',
            },
            graphBuilder
          );

          // Submit first data
          const submission1: MapDataSubmission = {
            format: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [fixedPointFeature(lon, lat)],
            } as GeoJSONFeatureCollection,
            priority: priority1,
            source: 'app1',
            timestamp: Date.now(),
          };

          const result1 = await pluginAPI.submitMapData(submission1);
          expect(result1.success).toBe(true);

          // Submit potentially conflicting data
          const submission2: MapDataSubmission = {
            format: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [fixedPointFeature(lon, lat)],
            } as GeoJSONFeatureCollection,
            priority: priority2,
            source: 'app2',
            timestamp: Date.now() + 1,
          };

          const result2 = await pluginAPI.submitMapData(submission2);
          
          // Second submission should succeed in merge mode
          expect(result2.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
