/**
 * Permission management for NightShift Navigator
 * Handles camera and location permission requests
 */

export type PermissionType = 'camera' | 'geolocation';

export interface PermissionStatus {
  type: PermissionType;
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export interface PermissionRequestResult {
  granted: boolean;
  error?: string;
}

/**
 * Manages device permissions for camera and location access
 */
export class PermissionManager {
  private permissionStates: Map<PermissionType, PermissionStatus> = new Map();

  /**
   * Request camera permission from the user
   * @returns Promise resolving to permission result
   */
  async requestCameraPermission(): Promise<PermissionRequestResult> {
    try {
      // Check if permissions API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          granted: false,
          error: 'Camera API not available on this device'
        };
      }

      // Request camera access - this will trigger browser permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });

      // Stop the stream immediately - we just needed to trigger permission
      stream.getTracks().forEach(track => track.stop());

      this.permissionStates.set('camera', {
        type: 'camera',
        granted: true,
        denied: false,
        prompt: false
      });

      return { granted: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.permissionStates.set('camera', {
        type: 'camera',
        granted: false,
        denied: true,
        prompt: false
      });

      return {
        granted: false,
        error: `Camera permission denied: ${errorMessage}`
      };
    }
  }

  /**
   * Request location permission from the user
   * @returns Promise resolving to permission result
   */
  async requestLocationPermission(): Promise<PermissionRequestResult> {
    try {
      // Check if geolocation API is available
      if (!navigator.geolocation) {
        return {
          granted: false,
          error: 'Geolocation API not available on this device'
        };
      }

      // Request location access - this will trigger browser permission prompt
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 0
        });
      });

      this.permissionStates.set('geolocation', {
        type: 'geolocation',
        granted: true,
        denied: false,
        prompt: false
      });

      return { granted: true };
    } catch (error) {
      // Check if error has GeolocationPositionError properties
      const isGeoError = error && typeof error === 'object' && 'code' in error;
      const errorMessage = isGeoError
        ? this.getGeolocationErrorMessage(error as GeolocationPositionError)
        : error instanceof Error ? error.message : 'Unknown error';

      this.permissionStates.set('geolocation', {
        type: 'geolocation',
        granted: false,
        denied: true,
        prompt: false
      });

      return {
        granted: false,
        error: `Location permission denied: ${errorMessage}`
      };
    }
  }

  /**
   * Check if a specific permission has been granted
   * @param type Permission type to check
   * @returns true if permission is granted
   */
  isPermissionGranted(type: PermissionType): boolean {
    const status = this.permissionStates.get(type);
    return status?.granted ?? false;
  }

  /**
   * Get the current status of a permission
   * @param type Permission type to query
   * @returns Permission status or undefined if not yet requested
   */
  getPermissionStatus(type: PermissionType): PermissionStatus | undefined {
    return this.permissionStates.get(type);
  }

  /**
   * Request all required permissions for NightShift Navigator
   * @returns Object with results for each permission type
   */
  async requestAllPermissions(): Promise<{
    camera: PermissionRequestResult;
    location: PermissionRequestResult;
  }> {
    const cameraResult = await this.requestCameraPermission();
    const locationResult = await this.requestLocationPermission();

    return {
      camera: cameraResult,
      location: locationResult
    };
  }

  /**
   * Convert GeolocationPositionError to user-friendly message
   */
  private getGeolocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'User denied location access';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable';
      case error.TIMEOUT:
        return 'Location request timed out';
      default:
        return 'Unknown geolocation error';
    }
  }

  /**
   * Reset all permission states (useful for testing)
   */
  reset(): void {
    this.permissionStates.clear();
  }
}

// Singleton instance
let permissionManagerInstance: PermissionManager | null = null;

/**
 * Get the global PermissionManager instance
 */
export function getPermissionManager(): PermissionManager {
  if (!permissionManagerInstance) {
    permissionManagerInstance = new PermissionManager();
  }
  return permissionManagerInstance;
}
