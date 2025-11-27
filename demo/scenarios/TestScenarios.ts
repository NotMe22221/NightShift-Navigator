/**
 * Test Scenarios for Demo Application
 * Provides simulated low-light scenarios with varying conditions
 * Implements Requirements 1.1, 2.2, 3.1
 */

export interface SimulatedHazard {
  id: string;
  type: 'obstacle' | 'uneven_surface' | 'drop_off' | 'unknown';
  position: { x: number; y: number }; // Normalized 0-1 coordinates
  confidence: number;
  size: number; // Relative size 0-1
}

export interface SimulatedRoute {
  waypoints: Array<{ x: number; y: number; label: string }>;
  totalDistance: number; // meters
}

export interface ScenarioConfig {
  name: string;
  description: string;
  lightLevel: number; // 0-1, where 0 is complete darkness
  shadowCoverage: number; // 0-1
  hazards: SimulatedHazard[];
  route: SimulatedRoute | null;
}

/**
 * Predefined test scenarios
 */
export const TEST_SCENARIOS: Record<string, ScenarioConfig> = {
  'low-light': {
    name: 'Low Light Environment',
    description: 'Simulates dusk conditions with reduced visibility',
    lightLevel: 0.3,
    shadowCoverage: 0.4,
    hazards: [
      {
        id: 'h1',
        type: 'obstacle',
        position: { x: 0.5, y: 0.6 },
        confidence: 0.75,
        size: 0.15
      },
      {
        id: 'h2',
        type: 'uneven_surface',
        position: { x: 0.3, y: 0.7 },
        confidence: 0.65,
        size: 0.2
      }
    ],
    route: {
      waypoints: [
        { x: 0.5, y: 0.9, label: 'Start' },
        { x: 0.4, y: 0.6, label: 'Turn Left' },
        { x: 0.6, y: 0.3, label: 'Destination' }
      ],
      totalDistance: 150
    }
  },

  'obstacles': {
    name: 'Multiple Obstacles',
    description: 'Urban environment with various obstacles',
    lightLevel: 0.5,
    shadowCoverage: 0.3,
    hazards: [
      {
        id: 'h1',
        type: 'obstacle',
        position: { x: 0.4, y: 0.5 },
        confidence: 0.85,
        size: 0.12
      },
      {
        id: 'h2',
        type: 'obstacle',
        position: { x: 0.6, y: 0.6 },
        confidence: 0.80,
        size: 0.10
      },
      {
        id: 'h3',
        type: 'drop_off',
        position: { x: 0.7, y: 0.4 },
        confidence: 0.90,
        size: 0.18
      },
      {
        id: 'h4',
        type: 'uneven_surface',
        position: { x: 0.3, y: 0.7 },
        confidence: 0.70,
        size: 0.25
      }
    ],
    route: {
      waypoints: [
        { x: 0.5, y: 0.9, label: 'Start' },
        { x: 0.3, y: 0.5, label: 'Avoid Obstacles' },
        { x: 0.5, y: 0.2, label: 'Destination' }
      ],
      totalDistance: 200
    }
  },

  'shadows': {
    name: 'Heavy Shadows',
    description: 'Environment with significant shadow coverage',
    lightLevel: 0.4,
    shadowCoverage: 0.7,
    hazards: [
      {
        id: 'h1',
        type: 'unknown',
        position: { x: 0.5, y: 0.5 },
        confidence: 0.45,
        size: 0.20
      },
      {
        id: 'h2',
        type: 'obstacle',
        position: { x: 0.6, y: 0.7 },
        confidence: 0.60,
        size: 0.15
      }
    ],
    route: {
      waypoints: [
        { x: 0.5, y: 0.9, label: 'Start' },
        { x: 0.7, y: 0.5, label: 'Through Shadows' },
        { x: 0.5, y: 0.2, label: 'Destination' }
      ],
      totalDistance: 180
    }
  },

  'night': {
    name: 'Night Navigation',
    description: 'Very low light conditions simulating nighttime',
    lightLevel: 0.1,
    shadowCoverage: 0.8,
    hazards: [
      {
        id: 'h1',
        type: 'obstacle',
        position: { x: 0.45, y: 0.6 },
        confidence: 0.55,
        size: 0.18
      },
      {
        id: 'h2',
        type: 'drop_off',
        position: { x: 0.7, y: 0.5 },
        confidence: 0.70,
        size: 0.22
      },
      {
        id: 'h3',
        type: 'uneven_surface',
        position: { x: 0.3, y: 0.4 },
        confidence: 0.50,
        size: 0.30
      }
    ],
    route: {
      waypoints: [
        { x: 0.5, y: 0.9, label: 'Start' },
        { x: 0.4, y: 0.6, label: 'Careful' },
        { x: 0.6, y: 0.3, label: 'Almost There' },
        { x: 0.5, y: 0.1, label: 'Destination' }
      ],
      totalDistance: 250
    }
  }
};

/**
 * Generate a random hazard for dynamic simulation
 */
export function generateRandomHazard(): SimulatedHazard {
  const types: Array<'obstacle' | 'uneven_surface' | 'drop_off' | 'unknown'> = [
    'obstacle',
    'uneven_surface',
    'drop_off',
    'unknown'
  ];

  return {
    id: `h_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: types[Math.floor(Math.random() * types.length)],
    position: {
      x: 0.2 + Math.random() * 0.6, // Keep hazards in central area
      y: 0.3 + Math.random() * 0.5
    },
    confidence: 0.5 + Math.random() * 0.4,
    size: 0.1 + Math.random() * 0.2
  };
}

/**
 * Apply scenario effects to a camera frame
 */
export function applyScenarioEffects(
  imageData: ImageData,
  scenario: ScenarioConfig
): ImageData {
  const data = imageData.data;
  const { lightLevel, shadowCoverage } = scenario;

  // Apply light level adjustment
  const lightMultiplier = lightLevel;

  // Apply shadow effect (darken random regions)
  const shadowThreshold = 1 - shadowCoverage;

  for (let i = 0; i < data.length; i += 4) {
    // Get pixel position
    const pixelIndex = i / 4;
    const x = pixelIndex % imageData.width;
    const y = Math.floor(pixelIndex / imageData.width);

    // Determine if pixel is in shadow (using noise pattern)
    const shadowNoise = (Math.sin(x * 0.05) + Math.cos(y * 0.05)) / 2 + 0.5;
    const inShadow = shadowNoise < shadowThreshold;

    // Apply effects
    const shadowMultiplier = inShadow ? 0.3 : 1.0;
    const finalMultiplier = lightMultiplier * shadowMultiplier;

    data[i] = Math.floor(data[i] * finalMultiplier);     // R
    data[i + 1] = Math.floor(data[i + 1] * finalMultiplier); // G
    data[i + 2] = Math.floor(data[i + 2] * finalMultiplier); // B
    // Alpha channel (i + 3) remains unchanged
  }

  return imageData;
}
