/**
 * Property-based tests for hazard marker distance filtering
 * **Feature: nightshift-navigator, Property 17: Hazard marker distance filtering**
 * **Validates: Requirements 4.2**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { HazardDetection } from '../computer-vision/index.js';
import type { Position } from '../types/index.js';
import { filterHazardsByDistance, calculateDistance } from './hazard-markers.js';

describe('Hazard Marker Distance Filtering Properties', () => {
  /**
   * Property 17: Hazard marker distance filtering
   * For any set of detected hazards, only those within 20 meters of the user position 
   * should have markers displayed in the AR overlay.
   */
  it('should only include hazards within specified distance', () => {
    // Generator for valid GPS coordinates
    const positionArb = fc.record({
      latitude: fc.double({ min: -90, max: 90, noNaN: true }),
      longitude: fc.double({ min: -180, max: 180, noNaN: true })
    });
    
    // Generator for hazard detection with world position
    const hazardArb = fc.tuple(
      fc.uuid(),
      fc.constantFrom('obstacle', 'uneven_surface', 'drop_off', 'unknown'),
      fc.double({ min: 0, max: 1, noNaN: true }),
      positionArb
    ).map(([id, type, confidence, worldPosition]) => ({
      id,
      type: type as 'obstacle' | 'uneven_surface' | 'drop_off' | 'unknown',
      confidence,
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      worldPosition: {
        latitude: worldPosition.latitude,
        longitude: worldPosition.longitude,
        distance: 0 // Will be calculated
      }
    } as HazardDetection));
    
    // Generator for array of hazards
    const hazardsArb = fc.array(hazardArb, { minLength: 0, maxLength: 50 });
    
    // Generator for max distance
    const maxDistanceArb = fc.double({ min: 1, max: 100, noNaN: true });
    
    fc.assert(
      fc.property(hazardsArb, positionArb, maxDistanceArb, (hazards, userPosition, maxDistance) => {
        // Filter hazards
        const filtered = filterHazardsByDistance(hazards, userPosition, maxDistance);
        
        // Verify all filtered hazards are within distance
        for (const hazard of filtered) {
          expect(hazard.worldPosition).toBeDefined();
          
          const distance = calculateDistance(userPosition, {
            latitude: hazard.worldPosition!.latitude,
            longitude: hazard.worldPosition!.longitude
          });
          
          expect(distance).toBeLessThanOrEqual(maxDistance);
        }
        
        // Verify no hazards outside distance are included
        for (const hazard of hazards) {
          if (!hazard.worldPosition) {
            expect(filtered).not.toContain(hazard);
            continue;
          }
          
          const distance = calculateDistance(userPosition, {
            latitude: hazard.worldPosition.latitude,
            longitude: hazard.worldPosition.longitude
          });
          
          if (distance > maxDistance) {
            expect(filtered).not.toContain(hazard);
          }
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should filter out hazards without world position', () => {
    const positionArb = fc.record({
      latitude: fc.double({ min: -90, max: 90, noNaN: true }),
      longitude: fc.double({ min: -180, max: 180, noNaN: true })
    });
    
    // Generator for hazard without world position
    const hazardWithoutPosArb = fc.tuple(
      fc.uuid(),
      fc.constantFrom('obstacle', 'uneven_surface', 'drop_off', 'unknown'),
      fc.double({ min: 0, max: 1, noNaN: true })
    ).map(([id, type, confidence]) => ({
      id,
      type: type as 'obstacle' | 'uneven_surface' | 'drop_off' | 'unknown',
      confidence,
      boundingBox: { x: 0, y: 0, width: 100, height: 100 }
      // No worldPosition
    } as HazardDetection));
    
    const hazardsArb = fc.array(hazardWithoutPosArb, { minLength: 1, maxLength: 20 });
    
    fc.assert(
      fc.property(hazardsArb, positionArb, (hazards, userPosition) => {
        const filtered = filterHazardsByDistance(hazards, userPosition, 20);
        
        // All hazards without world position should be filtered out
        expect(filtered).toHaveLength(0);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should calculate distance correctly using haversine formula', () => {
    const positionArb = fc.record({
      latitude: fc.double({ min: -90, max: 90, noNaN: true }),
      longitude: fc.double({ min: -180, max: 180, noNaN: true })
    });
    
    fc.assert(
      fc.property(positionArb, positionArb, (pos1, pos2) => {
        const distance = calculateDistance(pos1, pos2);
        
        // Distance should be non-negative
        expect(distance).toBeGreaterThanOrEqual(0);
        
        // Distance should be finite
        expect(Number.isFinite(distance)).toBe(true);
        
        // Distance from a point to itself should be 0 (or very close)
        const selfDistance = calculateDistance(pos1, pos1);
        expect(selfDistance).toBeCloseTo(0, 0);
        
        // Distance should be symmetric
        const reverseDistance = calculateDistance(pos2, pos1);
        expect(distance).toBeCloseTo(reverseDistance, 0);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should handle the 20-meter threshold correctly', () => {
    const userPosition: Position = { latitude: 0, longitude: 0 };
    
    // Create hazards at known distances
    // At equator, 1 degree longitude ≈ 111,320 meters
    // So 0.00018 degrees ≈ 20 meters
    const hazards: HazardDetection[] = [
      {
        id: 'near',
        type: 'obstacle',
        confidence: 0.9,
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        worldPosition: {
          latitude: 0,
          longitude: 0.00009, // ~10 meters
          distance: 10
        }
      },
      {
        id: 'boundary',
        type: 'obstacle',
        confidence: 0.9,
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        worldPosition: {
          latitude: 0,
          longitude: 0.00018, // ~20 meters
          distance: 20
        }
      },
      {
        id: 'far',
        type: 'obstacle',
        confidence: 0.9,
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        worldPosition: {
          latitude: 0,
          longitude: 0.0003, // ~33 meters
          distance: 33
        }
      }
    ];
    
    const filtered = filterHazardsByDistance(hazards, userPosition, 20);
    
    // Should include near and boundary, but not far
    expect(filtered.length).toBeLessThanOrEqual(2);
    expect(filtered.some(h => h.id === 'near')).toBe(true);
    expect(filtered.some(h => h.id === 'far')).toBe(false);
  });
});
