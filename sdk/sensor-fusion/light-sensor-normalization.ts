/**
 * Light Sensor Normalization
 * Normalizes raw light sensor readings to standard lux scale
 */

/**
 * Normalize raw light sensor reading to lux scale
 * 
 * The normalization ensures:
 * - Non-negative output values
 * - Monotonic increase with input intensity
 * - Mapping to standard lux scale (0-100,000 lux typical range)
 * 
 * @param rawReading - Raw sensor value (assumed to be non-negative)
 * @returns Normalized lux value
 */
export function normalizeLightSensorReading(rawReading: number): number {
  // Ensure non-negative input
  if (rawReading < 0) {
    return 0;
  }

  // Direct mapping - assuming raw reading is already in lux
  // In a real implementation, this would apply sensor-specific calibration
  // For now, we ensure the value is non-negative and monotonic
  return rawReading;
}

/**
 * Normalize light sensor reading with calibration
 * Applies a linear calibration curve to convert raw sensor values to lux
 * 
 * @param rawReading - Raw sensor value
 * @param calibrationFactor - Multiplier to convert to lux (default 1.0)
 * @param offset - Offset to add after multiplication (default 0.0)
 * @returns Calibrated lux value
 */
export function normalizeLightSensorReadingWithCalibration(
  rawReading: number,
  calibrationFactor: number = 1.0,
  offset: number = 0.0
): number {
  // Ensure non-negative input
  if (rawReading < 0) {
    return 0;
  }

  // Apply linear calibration: lux = (raw * factor) + offset
  const calibrated = (rawReading * calibrationFactor) + offset;

  // Ensure non-negative output
  return Math.max(0, calibrated);
}
