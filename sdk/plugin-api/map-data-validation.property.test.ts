/**
 * Property-Based Tests for Map Data Validation
 * 
 * **Feature: nightshift-navigator, Property 32: Map data validation**
 * **Validates: Requirements 7.2**
 * 
 * Property: For any map data submission, invalid or malformed data should be 
 * rejected with a descriptive error message.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PluginAPI, MapDataSubmission } from './index';
import { GraphBuilder } from '../pathfinding';
import { GeoJSONFeatureCollection } from '../pathfinding/geojson-parser';

describe('Property 32: Map data validation', () => {
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

  // Generator for valid GeoJSON FeatureCollection
  const validGeoJSON = fc.record({
    type: fc.constant('FeatureCollection' as const),
    features: fc.array(validFeature, { minLength: 1, maxLength: 20 }),
  });

  it('should accept valid GeoJSON data', async () => {
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
        
        // Valid data should be accepted
        expect(result.success).toBe(true);
        expect(result.message).not.toContain('Validation failed');
      }),
      { numRuns: 100 }
    );
  });

  it('should reject GeoJSON with invalid type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter(s => s !== 'FeatureCollection'),
        fc.array(validFeature, { minLength: 1, maxLength: 5 }),
        async (invalidType, features) => {
          const invalidGeoJSON = {
            type: invalidType,
            features,
          };

          const submission: MapDataSubmission = {
            format: 'geojson',
            data: invalidGeoJSON as any,
            priority: 5,
            source: 'test-app',
            timestamp: Date.now(),
          };

          const result = await pluginAPI.submitMapData(submission);
          
          // Invalid type should be rejected
          expect(result.success).toBe(false);
          expect(result.message).toContain('Validation failed');
          expect(result.message.toLowerCase()).toContain('type');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject GeoJSON with invalid coordinates (longitude out of range)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.double({ min: -1000, max: -180.01 }),
          fc.double({ min: 180.01, max: 1000 })
        ),
        fc.double({ min: -90, max: 90 }),
        async (invalidLon, validLat) => {
          const invalidGeoJSON: GeoJSONFeatureCollection = {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [invalidLon, validLat],
                },
                properties: {},
              },
            ],
          };

          const submission: MapDataSubmission = {
            format: 'geojson',
            data: invalidGeoJSON,
            priority: 5,
            source: 'test-app',
            timestamp: Date.now(),
          };

          const result = await pluginAPI.submitMapData(submission);
          
          // Invalid longitude should be rejected
          expect(result.success).toBe(false);
          expect(result.message).toContain('Validation failed');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject GeoJSON with invalid coordinates (latitude out of range)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: -180, max: 180 }),
        fc.oneof(
          fc.double({ min: -1000, max: -90.01 }),
          fc.double({ min: 90.01, max: 1000 })
        ),
        async (validLon, invalidLat) => {
          const invalidGeoJSON: GeoJSONFeatureCollection = {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [validLon, invalidLat],
                },
                properties: {},
              },
            ],
          };

          const submission: MapDataSubmission = {
            format: 'geojson',
            data: invalidGeoJSON,
            priority: 5,
            source: 'test-app',
            timestamp: Date.now(),
          };

          const result = await pluginAPI.submitMapData(submission);
          
          // Invalid latitude should be rejected
          expect(result.success).toBe(false);
          expect(result.message).toContain('Validation failed');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject GeoJSON with missing geometry', async () => {
    const invalidGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          // Missing geometry
          properties: {},
        },
      ],
    };

    const submission: MapDataSubmission = {
      format: 'geojson',
      data: invalidGeoJSON as any,
      priority: 5,
      source: 'test-app',
      timestamp: Date.now(),
    };

    const result = await pluginAPI.submitMapData(submission);
    
    // Missing geometry should be rejected
    expect(result.success).toBe(false);
    expect(result.message).toContain('Validation failed');
    expect(result.message.toLowerCase()).toContain('geometry');
  });

  it('should reject GeoJSON with invalid geometry type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter(s => !['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(s)),
        validCoordinate,
        async (invalidType, coords) => {
          const invalidGeoJSON = {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: invalidType,
                  coordinates: coords,
                },
                properties: {},
              },
            ],
          };

          const submission: MapDataSubmission = {
            format: 'geojson',
            data: invalidGeoJSON as any,
            priority: 5,
            source: 'test-app',
            timestamp: Date.now(),
          };

          const result = await pluginAPI.submitMapData(submission);
          
          // Invalid geometry type should be rejected
          expect(result.success).toBe(false);
          expect(result.message).toContain('Validation failed');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject LineString with fewer than 2 coordinates', async () => {
    const invalidGeoJSON: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0]], // Only 1 coordinate
          },
          properties: {},
        },
      ],
    };

    const submission: MapDataSubmission = {
      format: 'geojson',
      data: invalidGeoJSON,
      priority: 5,
      source: 'test-app',
      timestamp: Date.now(),
    };

    const result = await pluginAPI.submitMapData(submission);
    
    // LineString with < 2 coordinates should be rejected
    expect(result.success).toBe(false);
    expect(result.message).toContain('Validation failed');
  });

  it('should provide descriptive error messages for all validation failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Invalid type
          fc.record({
            type: fc.string().filter(s => s !== 'FeatureCollection'),
            features: fc.array(validFeature, { minLength: 1 }),
          }),
          // Missing features
          fc.record({
            type: fc.constant('FeatureCollection'),
            features: fc.constant(undefined),
          }),
          // Non-array features
          fc.record({
            type: fc.constant('FeatureCollection'),
            features: fc.string(),
          })
        ),
        async (invalidData) => {
          const submission: MapDataSubmission = {
            format: 'geojson',
            data: invalidData as any,
            priority: 5,
            source: 'test-app',
            timestamp: Date.now(),
          };

          const result = await pluginAPI.submitMapData(submission);
          
          // All validation failures should have descriptive messages
          expect(result.success).toBe(false);
          expect(result.message).toBeTruthy();
          expect(result.message.length).toBeGreaterThan(0);
          expect(result.message).toContain('Validation failed');
        }
      ),
      { numRuns: 100 }
    );
  });
});
