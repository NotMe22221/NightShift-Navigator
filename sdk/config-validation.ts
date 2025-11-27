/**
 * Configuration Validation Utilities
 * 
 * Provides validation functions for all SDK configuration objects.
 */

import type {
  SensorFusionConfig,
  CVConfig,
  PathfindingConfig,
  ARConfig,
  AudioConfig,
  EnergyConfig,
  PluginConfig
} from './index.js';

/**
 * Validation error with field and message
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate SensorFusionConfig
 * @param config The configuration to validate
 * @returns Validation result with any errors
 */
export function validateSensorFusionConfig(config: Partial<SensorFusionConfig>): ValidationResult {
  const errors: ValidationError[] = [];

  if (config.updateFrequencyHz !== undefined) {
    if (typeof config.updateFrequencyHz !== 'number' || isNaN(config.updateFrequencyHz)) {
      errors.push({ field: 'updateFrequencyHz', message: 'Must be a valid number' });
    } else if (config.updateFrequencyHz <= 0) {
      errors.push({ field: 'updateFrequencyHz', message: 'Must be greater than 0' });
    } else if (config.updateFrequencyHz < 5) {
      errors.push({ field: 'updateFrequencyHz', message: 'Must be at least 5 Hz (requirement 1.5)' });
    }
  }

  if (config.weightings !== undefined) {
    if (typeof config.weightings !== 'object') {
      errors.push({ field: 'weightings', message: 'Must be an object' });
    } else {
      const { camera, lightSensor, shadowDetection } = config.weightings;
      
      if (typeof camera !== 'number' || isNaN(camera) || camera < 0 || camera > 1) {
        errors.push({ field: 'weightings.camera', message: 'Must be a valid number between 0 and 1' });
      }
      
      if (typeof lightSensor !== 'number' || isNaN(lightSensor) || lightSensor < 0 || lightSensor > 1) {
        errors.push({ field: 'weightings.lightSensor', message: 'Must be a valid number between 0 and 1' });
      }
      
      if (typeof shadowDetection !== 'number' || isNaN(shadowDetection) || shadowDetection < 0 || shadowDetection > 1) {
        errors.push({ field: 'weightings.shadowDetection', message: 'Must be a valid number between 0 and 1' });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate CVConfig
 * @param config The configuration to validate
 * @returns Validation result with any errors
 */
export function validateCVConfig(config: Partial<CVConfig>): ValidationResult {
  const errors: ValidationError[] = [];

  if (config.targetFPS !== undefined) {
    if (typeof config.targetFPS !== 'number') {
      errors.push({ field: 'targetFPS', message: 'Must be a number' });
    } else if (config.targetFPS <= 0) {
      errors.push({ field: 'targetFPS', message: 'Must be greater than 0' });
    } else if (config.targetFPS < 10) {
      errors.push({ field: 'targetFPS', message: 'Must be at least 10 fps (requirement 2.5)' });
    }
  }

  if (config.maxMemoryMB !== undefined) {
    if (typeof config.maxMemoryMB !== 'number') {
      errors.push({ field: 'maxMemoryMB', message: 'Must be a number' });
    } else if (config.maxMemoryMB <= 0) {
      errors.push({ field: 'maxMemoryMB', message: 'Must be greater than 0' });
    } else if (config.maxMemoryMB > 150) {
      errors.push({ field: 'maxMemoryMB', message: 'Must not exceed 150 MB (requirement 11.1)' });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate PathfindingConfig
 */
export function validatePathfindingConfig(config: Partial<PathfindingConfig>): ValidationResult {
  const errors: ValidationError[] = [];

  if (config.maxGraphNodes !== undefined) {
    if (typeof config.maxGraphNodes !== 'number') {
      errors.push({ field: 'maxGraphNodes', message: 'Must be a number' });
    } else if (config.maxGraphNodes <= 0) {
      errors.push({ field: 'maxGraphNodes', message: 'Must be greater than 0' });
    } else if (config.maxGraphNodes > 10000) {
      errors.push({ field: 'maxGraphNodes', message: 'Must not exceed 10,000 nodes (requirement 11.2)' });
    }
  }

  if (config.routeCalculationTimeoutMs !== undefined) {
    if (typeof config.routeCalculationTimeoutMs !== 'number') {
      errors.push({ field: 'routeCalculationTimeoutMs', message: 'Must be a number' });
    } else if (config.routeCalculationTimeoutMs <= 0) {
      errors.push({ field: 'routeCalculationTimeoutMs', message: 'Must be greater than 0' });
    } else if (config.routeCalculationTimeoutMs > 3000) {
      errors.push({ field: 'routeCalculationTimeoutMs', message: 'Must not exceed 3000 ms (requirement 11.2)' });
    }
  }

  if (config.costWeights !== undefined) {
    if (typeof config.costWeights !== 'object') {
      errors.push({ field: 'costWeights', message: 'Must be an object' });
    } else {
      const { distance, visibility, safety } = config.costWeights;
      
      if (typeof distance !== 'number' || isNaN(distance) || distance < 0) {
        errors.push({ field: 'costWeights.distance', message: 'Must be a valid non-negative number' });
      }
      
      if (typeof visibility !== 'number' || isNaN(visibility) || visibility < 0) {
        errors.push({ field: 'costWeights.visibility', message: 'Must be a valid non-negative number' });
      }
      
      if (typeof safety !== 'number' || isNaN(safety) || safety < 0) {
        errors.push({ field: 'costWeights.safety', message: 'Must be a valid non-negative number' });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate ARConfig
 */
export function validateARConfig(config: Partial<ARConfig>): ValidationResult {
  const errors: ValidationError[] = [];

  if (config.targetFPS !== undefined) {
    if (typeof config.targetFPS !== 'number') {
      errors.push({ field: 'targetFPS', message: 'Must be a number' });
    } else if (config.targetFPS <= 0) {
      errors.push({ field: 'targetFPS', message: 'Must be greater than 0' });
    } else if (config.targetFPS < 30) {
      errors.push({ field: 'targetFPS', message: 'Must be at least 30 fps (requirement 4.5)' });
    }
  }

  if (config.maxPositionJitterCm !== undefined) {
    if (typeof config.maxPositionJitterCm !== 'number' || isNaN(config.maxPositionJitterCm)) {
      errors.push({ field: 'maxPositionJitterCm', message: 'Must be a valid number' });
    } else if (config.maxPositionJitterCm <= 0) {
      errors.push({ field: 'maxPositionJitterCm', message: 'Must be greater than 0' });
    } else if (config.maxPositionJitterCm > 5) {
      errors.push({ field: 'maxPositionJitterCm', message: 'Must not exceed 5 cm (requirement 4.4)' });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate AudioConfig
 */
export function validateAudioConfig(config: Partial<AudioConfig>): ValidationResult {
  const errors: ValidationError[] = [];

  if (config.speechRate !== undefined) {
    if (typeof config.speechRate !== 'number') {
      errors.push({ field: 'speechRate', message: 'Must be a number' });
    } else if (config.speechRate < 0.5 || config.speechRate > 2.0) {
      errors.push({ field: 'speechRate', message: 'Must be between 0.5x and 2.0x (requirement 5.4)' });
    }
  }

  if (config.volume !== undefined) {
    if (typeof config.volume !== 'number') {
      errors.push({ field: 'volume', message: 'Must be a number' });
    } else if (config.volume < 0 || config.volume > 1) {
      errors.push({ field: 'volume', message: 'Must be between 0 and 1' });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate EnergyConfig
 */
export function validateEnergyConfig(config: Partial<EnergyConfig>): ValidationResult {
  const errors: ValidationError[] = [];

  if (config.lowPowerThreshold !== undefined) {
    if (typeof config.lowPowerThreshold !== 'number') {
      errors.push({ field: 'lowPowerThreshold', message: 'Must be a number' });
    } else if (config.lowPowerThreshold < 0 || config.lowPowerThreshold > 100) {
      errors.push({ field: 'lowPowerThreshold', message: 'Must be between 0 and 100' });
    }
  }

  if (config.criticalPowerThreshold !== undefined) {
    if (typeof config.criticalPowerThreshold !== 'number') {
      errors.push({ field: 'criticalPowerThreshold', message: 'Must be a number' });
    } else if (config.criticalPowerThreshold < 0 || config.criticalPowerThreshold > 100) {
      errors.push({ field: 'criticalPowerThreshold', message: 'Must be between 0 and 100' });
    }
  }

  if (config.lowPowerThreshold !== undefined && config.criticalPowerThreshold !== undefined) {
    if (config.criticalPowerThreshold >= config.lowPowerThreshold) {
      errors.push({
        field: 'criticalPowerThreshold',
        message: 'Must be less than lowPowerThreshold'
      });
    }
  }

  if (config.monitoringIntervalMs !== undefined) {
    if (typeof config.monitoringIntervalMs !== 'number') {
      errors.push({ field: 'monitoringIntervalMs', message: 'Must be a number' });
    } else if (config.monitoringIntervalMs <= 0) {
      errors.push({ field: 'monitoringIntervalMs', message: 'Must be greater than 0' });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate PluginConfig
 */
export function validatePluginConfig(config: Partial<PluginConfig>): ValidationResult {
  const errors: ValidationError[] = [];

  if (config.maxDataSizeMB !== undefined) {
    if (typeof config.maxDataSizeMB !== 'number') {
      errors.push({ field: 'maxDataSizeMB', message: 'Must be a number' });
    } else if (config.maxDataSizeMB <= 0) {
      errors.push({ field: 'maxDataSizeMB', message: 'Must be greater than 0' });
    }
  }

  if (config.conflictResolution !== undefined) {
    const validStrategies = ['priority', 'merge', 'reject'];
    if (!validStrategies.includes(config.conflictResolution)) {
      errors.push({
        field: 'conflictResolution',
        message: `Must be one of: ${validStrategies.join(', ')}`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format validation errors into a readable error message
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'Configuration is valid';
  }

  const messages = errors.map(e => `${e.field}: ${e.message}`);
  return `Configuration validation failed:\n  - ${messages.join('\n  - ')}`;
}

/**
 * Validate and throw if invalid
 */
export function validateOrThrow<T>(
  config: Partial<T>,
  validator: (config: Partial<T>) => ValidationResult,
  configName: string
): void {
  const result = validator(config);
  
  if (!result.valid) {
    throw new Error(`${configName} validation failed:\n  - ${result.errors.map(e => `${e.field}: ${e.message}`).join('\n  - ')}`);
  }
}
