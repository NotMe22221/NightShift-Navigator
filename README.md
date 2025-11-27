# NightShift Navigator

A darkness-adaptive navigation system for mobile devices that combines computer vision, ambient-light sensing, pathfinding algorithms, augmented reality overlays, and energy-aware routing into a unified platform.

## Features

- **Sensor Fusion**: Aggregates camera brightness, light sensor, and shadow detection
- **Computer Vision**: Detects hazards and analyzes environmental conditions
- **Smart Pathfinding**: Calculates routes optimized for visibility and safety
- **AR Overlay**: Renders navigation paths and hazard markers in augmented reality
- **Audio Accessibility**: Provides spoken navigation and directional audio cues
- **Energy Management**: Adapts behavior based on battery level
- **Plugin API**: Allows third-party map data integration

## Installation

```bash
npm install nightshift-navigator
```

## Quick Start

```typescript
import { SensorFusionLayer, PathfindingEngine, AROverlayUI } from 'nightshift-navigator';

// Initialize components
const sensorFusion = new SensorFusionLayer();
await sensorFusion.initialize({
  cameraEnabled: true,
  lightSensorEnabled: true,
  shadowDetectionEnabled: true,
  updateFrequencyHz: 5,
  weightings: { camera: 0.4, lightSensor: 0.4, shadowDetection: 0.2 }
});

// Start navigation
sensorFusion.start();
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build SDK
npm run build

# Run demo
npm run dev
```

## Documentation

See the `.kiro/specs/nightshift-navigator/` directory for:
- Requirements document
- Design document
- Implementation tasks

## License

MIT
