/**
 * Weighted Sensor Fusion Algorithm
 * Combines camera brightness, light sensor, and shadow data
 */

/**
 * Sensor fusion weights configuration
 */
export interface FusionWeights {
  camera: number;
  lightSensor: number;
  shadowDetection: number;
}

/**
 * Individual sensor inputs for fusion
 */
export interface SensorInputs {
  cameraBrightness: number; // 0-1 normalized (from mean luminance / 255)
  lightSensorLux: number;   // lux value
  shadowCoverage: number;   // 0-1 (percentage)
}

/**
 * Compute weighted sensor fusion
 * 
 * Formula: unifiedLightLevel = w1*camera + w2*lightSensor + w3*(1-shadowCoverage)
 * 
 * Where:
 * - camera is normalized brightness (0-1)
 * - lightSensor is normalized lux (0-1, scaled from typical range)
 * - shadowCoverage is inverted (1-shadowCoverage) so more shadows = lower light
 * 
 * @param inputs - Sensor input values
 * @param weights - Fusion weights (should sum to 1.0 for proper normalization)
 * @returns Unified light level metric (0-1 normalized)
 */
export function computeWeightedFusion(
  inputs: SensorInputs,
  weights: FusionWeights
): number {
  // Clamp camera brightness to 0-1 (optimized with ternary)
  const normalizedCamera = inputs.cameraBrightness < 0 ? 0 : 
                          inputs.cameraBrightness > 1 ? 1 : 
                          inputs.cameraBrightness;
  
  // Normalize light sensor lux to 0-1 scale
  // Typical indoor range: 0-1000 lux, outdoor: up to 100,000 lux
  // Using logarithmic scale for better distribution
  const normalizedLux = normalizeLuxToScale(inputs.lightSensorLux);
  
  // Clamp shadow coverage and invert (more shadows = lower light)
  const shadowClamped = inputs.shadowCoverage < 0 ? 0 :
                       inputs.shadowCoverage > 1 ? 1 :
                       inputs.shadowCoverage;
  const invertedShadow = 1 - shadowClamped;
  
  // Apply weighted fusion (single expression to reduce overhead)
  const unifiedLightLevel = 
    weights.camera * normalizedCamera +
    weights.lightSensor * normalizedLux +
    weights.shadowDetection * invertedShadow;
  
  // Clamp output to 0-1 range
  return unifiedLightLevel < 0 ? 0 : unifiedLightLevel > 1 ? 1 : unifiedLightLevel;
}

/**
 * Normalize lux value to 0-1 scale using logarithmic mapping
 * 
 * @param lux - Light sensor reading in lux
 * @returns Normalized value 0-1
 */
function normalizeLuxToScale(lux: number): number {
  if (lux <= 0) {
    return 0;
  }
  
  // Logarithmic scale: log10(lux + 1) / log10(100001)
  // Maps 0 lux -> 0, 100,000 lux -> 1
  const maxLux = 100000;
  const normalized = Math.log10(lux + 1) / Math.log10(maxLux + 1);
  
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Validate fusion weights
 * Weights should be non-negative and ideally sum to 1.0
 * 
 * @param weights - Fusion weights to validate
 * @returns true if weights are valid
 */
export function validateFusionWeights(weights: FusionWeights): boolean {
  const { camera, lightSensor, shadowDetection } = weights;
  
  // All weights must be non-negative
  if (camera < 0 || lightSensor < 0 || shadowDetection < 0) {
    return false;
  }
  
  // Weights should sum to approximately 1.0 (allow small floating point error)
  const sum = camera + lightSensor + shadowDetection;
  const tolerance = 0.01;
  
  return Math.abs(sum - 1.0) < tolerance;
}

/**
 * Normalize weights to sum to 1.0
 * 
 * @param weights - Fusion weights (possibly unnormalized)
 * @returns Normalized weights that sum to 1.0
 */
export function normalizeFusionWeights(weights: FusionWeights): FusionWeights {
  const sum = weights.camera + weights.lightSensor + weights.shadowDetection;
  
  if (sum === 0) {
    // If all weights are zero, use equal weights
    return {
      camera: 1/3,
      lightSensor: 1/3,
      shadowDetection: 1/3,
    };
  }
  
  return {
    camera: weights.camera / sum,
    lightSensor: weights.lightSensor / sum,
    shadowDetection: weights.shadowDetection / sum,
  };
}
