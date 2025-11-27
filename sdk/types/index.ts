/**
 * Common types and interfaces used across the NightShift Navigator SDK
 */

/**
 * Geographic position with optional altitude and accuracy
 */
export interface Position {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

/**
 * Geographic bounds defining a rectangular region
 */
export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Device pose for AR tracking
 */
export interface DevicePose {
  position: Position;
  orientation: {
    pitch: number; // degrees
    yaw: number; // degrees
    roll: number; // degrees
  };
  timestamp: number;
}

/**
 * System error types
 */
export interface SystemError {
  code: string;
  message: string;
  component: string;
  timestamp: number;
  recoverable: boolean;
}
