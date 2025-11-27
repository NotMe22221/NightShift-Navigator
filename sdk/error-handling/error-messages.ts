/**
 * User-Friendly Error Messaging System
 * Provides clear error messages and recovery suggestions for all failure types
 */

import { SystemError, ErrorType } from './index';

/**
 * User-friendly error message with recovery suggestions
 */
export interface UserErrorMessage {
  title: string;
  description: string;
  recoverySuggestions: string[];
  technicalDetails?: string;
  canAutoRecover: boolean;
}

/**
 * Error message templates for different error types
 */
const ERROR_MESSAGES: Record<ErrorType, Record<string, UserErrorMessage>> = {
  sensor_error: {
    camera_unavailable: {
      title: 'Camera Unavailable',
      description: 'The camera is not accessible. Navigation will continue using ambient light sensors only.',
      recoverySuggestions: [
        'Check that camera permissions are granted in your device settings',
        'Close other apps that might be using the camera',
        'Restart the application'
      ],
      canAutoRecover: true
    },
    light_sensor_unavailable: {
      title: 'Light Sensor Unavailable',
      description: 'The ambient light sensor is not accessible. Navigation will use camera-based brightness detection.',
      recoverySuggestions: [
        'Check device sensor permissions',
        'Restart the application'
      ],
      canAutoRecover: true
    },
    gps_unavailable: {
      title: 'GPS Signal Lost',
      description: 'Location services are unavailable. Navigation will use motion sensors for position estimation.',
      recoverySuggestions: [
        'Move to an area with better GPS signal',
        'Check that location permissions are granted',
        'Ensure location services are enabled on your device'
      ],
      canAutoRecover: true
    },
    battery_status_unavailable: {
      title: 'Battery Status Unknown',
      description: 'Unable to monitor battery level. Power management features will be disabled.',
      recoverySuggestions: [
        'Continue navigation with caution',
        'Monitor battery level manually'
      ],
      canAutoRecover: false
    },
    default: {
      title: 'Sensor Error',
      description: 'A sensor has encountered an error. The system will attempt to continue with available sensors.',
      recoverySuggestions: [
        'Check device permissions',
        'Restart the application'
      ],
      canAutoRecover: true
    }
  },
  processing_error: {
    cv_frame_processing_failed: {
      title: 'Vision Processing Error',
      description: 'Unable to process camera frame. Hazard detection may be temporarily unavailable.',
      recoverySuggestions: [
        'The system will continue processing subsequent frames',
        'If the issue persists, restart the application'
      ],
      canAutoRecover: true
    },
    hazard_classifier_crashed: {
      title: 'Hazard Detection Error',
      description: 'The hazard detection system encountered an error. Navigation will continue with reduced safety information.',
      recoverySuggestions: [
        'Proceed with extra caution',
        'The system will attempt to restart hazard detection',
        'Consider restarting the application'
      ],
      canAutoRecover: true
    },
    memory_allocation_failed: {
      title: 'Memory Error',
      description: 'The system is running low on memory. Some features may be temporarily disabled.',
      recoverySuggestions: [
        'Close other applications to free up memory',
        'Restart the application',
        'Consider using low-power mode'
      ],
      canAutoRecover: true
    },
    performance_degradation: {
      title: 'Performance Warning',
      description: 'System performance has degraded. Visual quality may be reduced to maintain responsiveness.',
      recoverySuggestions: [
        'Close other applications',
        'Enable low-power mode to reduce processing load',
        'Continue with reduced visual quality'
      ],
      canAutoRecover: true
    },
    default: {
      title: 'Processing Error',
      description: 'An error occurred during data processing. The system will attempt to continue operation.',
      recoverySuggestions: [
        'The system will retry automatically',
        'If the issue persists, restart the application'
      ],
      canAutoRecover: true
    }
  },
  navigation_error: {
    no_route_found: {
      title: 'No Route Available',
      description: 'Unable to find a route to your destination with current map data.',
      recoverySuggestions: [
        'Check that your destination is accessible',
        'Try a different destination nearby',
        'Ensure map data is available for this area'
      ],
      canAutoRecover: false
    },
    graph_construction_failed: {
      title: 'Map Data Error',
      description: 'Unable to process map data for navigation.',
      recoverySuggestions: [
        'Check your internet connection',
        'Try reloading map data',
        'Restart the application'
      ],
      canAutoRecover: true
    },
    invalid_map_data: {
      title: 'Invalid Map Data',
      description: 'The map data for this area is corrupted or invalid.',
      recoverySuggestions: [
        'Clear cached map data',
        'Download fresh map data',
        'Report this issue if it persists'
      ],
      canAutoRecover: false
    },
    route_calculation_timeout: {
      title: 'Route Calculation Timeout',
      description: 'Route calculation is taking longer than expected.',
      recoverySuggestions: [
        'Try a shorter route',
        'Wait for the calculation to complete',
        'Restart the application'
      ],
      canAutoRecover: true
    },
    default: {
      title: 'Navigation Error',
      description: 'An error occurred during navigation. The system will attempt to recalculate your route.',
      recoverySuggestions: [
        'Wait for route recalculation',
        'Try selecting a different destination',
        'Restart navigation'
      ],
      canAutoRecover: true
    }
  },
  rendering_error: {
    ar_initialization_failed: {
      title: 'AR Unavailable',
      description: 'Augmented reality features could not be initialized. Switching to audio-only navigation.',
      recoverySuggestions: [
        'Audio navigation is now active',
        'Check that AR permissions are granted',
        'Ensure your device supports AR features'
      ],
      canAutoRecover: true
    },
    frame_rate_drop: {
      title: 'Performance Warning',
      description: 'Visual rendering is running slower than optimal. Quality has been reduced to maintain responsiveness.',
      recoverySuggestions: [
        'Close other applications',
        'Continue with reduced visual quality',
        'Enable low-power mode'
      ],
      canAutoRecover: true
    },
    pose_tracking_lost: {
      title: 'Tracking Lost',
      description: 'AR tracking has been lost. Visual overlays may be temporarily inaccurate.',
      recoverySuggestions: [
        'Move your device slowly',
        'Ensure adequate lighting',
        'Point camera at visible features'
      ],
      canAutoRecover: true
    },
    audio_output_unavailable: {
      title: 'Audio Unavailable',
      description: 'Audio output is not available. Navigation will rely on visual display only.',
      recoverySuggestions: [
        'Check device volume settings',
        'Ensure audio permissions are granted',
        'Check that headphones are connected properly'
      ],
      canAutoRecover: false
    },
    default: {
      title: 'Display Error',
      description: 'An error occurred with the display system. The system will attempt to continue with available output methods.',
      recoverySuggestions: [
        'The system will try alternative display methods',
        'Restart the application if issues persist'
      ],
      canAutoRecover: true
    }
  },
  integration_error: {
    plugin_authentication_failed: {
      title: 'Plugin Authentication Failed',
      description: 'Unable to authenticate with external plugin.',
      recoverySuggestions: [
        'Check your API credentials',
        'Verify your internet connection',
        'Contact the plugin provider'
      ],
      canAutoRecover: false
    },
    invalid_data_submission: {
      title: 'Invalid Data',
      description: 'The submitted data format is invalid and cannot be processed.',
      recoverySuggestions: [
        'Check the data format matches requirements',
        'Verify all required fields are present',
        'Consult the API documentation'
      ],
      canAutoRecover: false
    },
    network_timeout: {
      title: 'Network Timeout',
      description: 'Network request timed out. Operating in offline mode with cached data.',
      recoverySuggestions: [
        'Check your internet connection',
        'Cached data will be used for navigation',
        'Try again when connection is restored'
      ],
      canAutoRecover: true
    },
    cache_corruption: {
      title: 'Cache Error',
      description: 'Cached data is corrupted and has been cleared.',
      recoverySuggestions: [
        'Fresh data will be downloaded',
        'Ensure stable internet connection',
        'Navigation will resume once data is available'
      ],
      canAutoRecover: true
    },
    default: {
      title: 'Integration Error',
      description: 'An error occurred while communicating with external services.',
      recoverySuggestions: [
        'Check your internet connection',
        'The system will retry automatically',
        'Restart the application if issues persist'
      ],
      canAutoRecover: true
    }
  }
};

/**
 * Generate a user-friendly error message from a SystemError
 */
export function generateUserErrorMessage(error: SystemError): UserErrorMessage {
  const errorTypeMessages = ERROR_MESSAGES[error.type];
  
  if (!errorTypeMessages) {
    return {
      title: 'System Error',
      description: error.message,
      recoverySuggestions: ['Restart the application', 'Contact support if the issue persists'],
      technicalDetails: error.stack,
      canAutoRecover: false
    };
  }

  // Try to find a specific message based on component or context
  // Sanitize component name to handle arbitrary strings
  const specificKey = error.component
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')  // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, '');      // Remove leading/trailing underscores
  
  // Use hasOwnProperty to avoid prototype pollution issues
  const message = (errorTypeMessages.hasOwnProperty(specificKey) && errorTypeMessages[specificKey]) 
    ? errorTypeMessages[specificKey] 
    : errorTypeMessages.default;

  if (!message) {
    return {
      title: 'System Error',
      description: error.message,
      recoverySuggestions: ['Restart the application', 'Contact support if the issue persists'],
      technicalDetails: error.stack,
      canAutoRecover: false
    };
  }

  return {
    ...message,
    technicalDetails: error.stack
  };
}

/**
 * Format error message for display
 */
export function formatErrorMessage(message: UserErrorMessage, includeDetails: boolean = false): string {
  let formatted = `${message.title}\n\n${message.description}\n`;

  if (message.recoverySuggestions && message.recoverySuggestions.length > 0) {
    formatted += '\nWhat you can do:\n';
    message.recoverySuggestions.forEach((suggestion, index) => {
      formatted += `${index + 1}. ${suggestion}\n`;
    });
  }

  if (includeDetails && message.technicalDetails) {
    formatted += `\nTechnical Details:\n${message.technicalDetails}\n`;
  }

  return formatted;
}

/**
 * Display error message to user (console implementation)
 * In a real application, this would show a UI dialog or notification
 */
export function displayErrorMessage(error: SystemError, includeDetails: boolean = false): void {
  const userMessage = generateUserErrorMessage(error);
  const formatted = formatErrorMessage(userMessage, includeDetails);
  
  console.error(formatted);
  
  // In a real application, you would:
  // - Show a modal dialog
  // - Display a toast notification
  // - Update a status bar
  // - Trigger haptic feedback
}

/**
 * Attempt automatic recovery for an error
 */
export function shouldAttemptAutoRecovery(error: SystemError): boolean {
  const userMessage = generateUserErrorMessage(error);
  return userMessage.canAutoRecover;
}
