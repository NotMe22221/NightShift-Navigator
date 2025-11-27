# NightShift Navigator - Demo Application

This demo application showcases the capabilities of the NightShift Navigator SDK with simulated low-light scenarios and interactive controls.

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Modern web browser with camera access support
- HTTPS connection (required for camera access) or localhost

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

4. Grant camera permissions when prompted

## Demo Features

### Camera Feed Display

The demo displays a live camera feed from your device's camera. The feed is processed in real-time to analyze brightness levels and detect environmental conditions.

**Requirements Validated:** 1.1, 2.1

### Test Scenarios

The demo includes several predefined scenarios that simulate different low-light conditions:

#### Low Light Environment
- Simulates dusk conditions with reduced visibility
- Light level: 30%
- Shadow coverage: 40%
- 2 simulated hazards
- Sample navigation route

#### Multiple Obstacles
- Urban environment with various obstacles
- Light level: 50%
- Shadow coverage: 30%
- 4 simulated hazards of different types
- Navigation route avoiding obstacles

#### Heavy Shadows
- Environment with significant shadow coverage
- Light level: 40%
- Shadow coverage: 70%
- 2 simulated hazards (some with low confidence)
- Route through shadowed areas

#### Night Navigation
- Very low light conditions simulating nighttime
- Light level: 10%
- Shadow coverage: 80%
- 3 simulated hazards
- Multi-waypoint navigation route

**Requirements Validated:** 1.1, 2.2, 3.1

### Module Controls

Toggle individual SDK modules on/off:

- **Computer Vision**: Enable/disable CV processing
- **AR Overlay**: Enable/disable augmented reality overlays
- **Audio Guidance**: Enable/disable audio navigation cues

**Requirements Validated:** 4.1, 5.1

### Energy Management

Simulate different power modes:

- **Normal Mode**: Full functionality
- **Low Power Mode**: Reduced CV frame rate (simulates 20% battery)
- **Critical Mode**: AR disabled, audio only (simulates 10% battery)

Adjust battery level slider to see how the system would adapt to different power states.

**Requirements Validated:** 6.1, 6.2, 6.3

### Navigation Controls

- **Start Route**: Begin navigation with the current scenario's route
- **Stop Route**: End navigation
- **Simulate Hazard**: Add a random hazard to the current view

### System Metrics

Real-time display of system performance:

- **CV FPS**: Computer vision processing frame rate
- **AR FPS**: AR rendering frame rate (when implemented)
- **Light Level**: Normalized ambient light level (0-1)
- **Hazards**: Number of detected/simulated hazards
- **Memory**: JavaScript heap memory usage

## Usage Examples

### Basic Camera Access

```typescript
import { CameraController } from './components/CameraController';

const camera = new CameraController();
await camera.initialize();

// Start camera
await camera.start();

// Process frames
camera.onFrame((frame: ImageData) => {
  // Process frame data
  console.log('Frame captured:', frame.width, 'x', frame.height);
});

// Stop camera
camera.stop();
```

### Applying Test Scenarios

```typescript
import { ScenarioManager } from './components/ScenarioManager';
import { TEST_SCENARIOS } from './scenarios/TestScenarios';

const scenarioManager = new ScenarioManager();
scenarioManager.initialize(cameraController);

// Apply a scenario
scenarioManager.applyScenario('low-light');

// Start navigation
scenarioManager.startRoute();

// Add a random hazard
scenarioManager.simulateHazard();
```

### Monitoring System Metrics

```typescript
import { MetricsDisplay } from './components/MetricsDisplay';

const metricsDisplay = new MetricsDisplay();
metricsDisplay.initialize();

// Update metrics
scenarioManager.onMetricsUpdate((metrics) => {
  metricsDisplay.update(metrics);
  console.log('CV FPS:', metrics.cvFPS);
  console.log('Light Level:', metrics.lightLevel);
});
```

### Creating Custom Scenarios

```typescript
import type { ScenarioConfig } from './scenarios/TestScenarios';

const customScenario: ScenarioConfig = {
  name: 'Custom Scenario',
  description: 'My custom test scenario',
  lightLevel: 0.25,
  shadowCoverage: 0.5,
  hazards: [
    {
      id: 'h1',
      type: 'obstacle',
      position: { x: 0.5, y: 0.5 },
      confidence: 0.8,
      size: 0.15
    }
  ],
  route: {
    waypoints: [
      { x: 0.5, y: 0.9, label: 'Start' },
      { x: 0.5, y: 0.1, label: 'End' }
    ],
    totalDistance: 100
  }
};
```

## SDK Integration Examples

### Sensor Fusion

```typescript
import { SensorFusionLayer } from '../sdk/sensor-fusion';

const sensorFusion = new SensorFusionLayer();
await sensorFusion.initialize({
  cameraEnabled: true,
  lightSensorEnabled: true,
  shadowDetectionEnabled: true,
  updateFrequencyHz: 5,
  weightings: {
    camera: 0.5,
    lightSensor: 0.3,
    shadowDetection: 0.2
  }
});

sensorFusion.start();

sensorFusion.onMetricsUpdate((metrics) => {
  console.log('Light level:', metrics.unifiedLightLevel);
  console.log('Shadow coverage:', metrics.shadowCoverage);
});
```

### Computer Vision Pipeline

```typescript
import { CVPipeline } from '../sdk/computer-vision';

const cvPipeline = new CVPipeline();
await cvPipeline.initialize({
  targetFPS: 10,
  maxMemoryMB: 150,
  hazardDetectionEnabled: true,
  contrastMapEnabled: true
});

const result = await cvPipeline.processFrame(imageData);
console.log('Hazards detected:', result.hazards.length);
console.log('Processing time:', result.processingTimeMs, 'ms');
```

### Pathfinding Engine

```typescript
import { PathfindingEngine } from '../sdk/pathfinding';

const pathfinding = new PathfindingEngine();
await pathfinding.initialize({
  maxGraphNodes: 10000,
  routeCalculationTimeoutMs: 3000,
  costWeights: {
    distance: 0.4,
    visibility: 0.3,
    safety: 0.3
  }
});

// Build graph from GeoJSON
await pathfinding.buildGraph(mapData);

// Calculate route
const route = await pathfinding.calculateRoute(startPos, endPos);
console.log('Route distance:', route.totalDistance, 'meters');
```

## Controls Reference

### Keyboard Shortcuts

- None currently implemented (future enhancement)

### Mouse/Touch Interactions

- Click scenario buttons to apply test scenarios
- Use sliders to adjust battery level
- Toggle checkboxes to enable/disable modules
- Click navigation buttons to control route display

## Troubleshooting

### Camera Not Working

- Ensure you're accessing the demo via HTTPS or localhost
- Grant camera permissions when prompted
- Check that no other application is using the camera
- Try refreshing the page

### Performance Issues

- Reduce browser window size
- Close other tabs/applications
- Try a different browser (Chrome/Edge recommended)
- Check system metrics for memory usage

### Scenarios Not Applying

- Ensure camera is started first
- Check browser console for errors
- Try stopping and restarting the camera

## Browser Compatibility

- Chrome 90+: Full support
- Edge 90+: Full support
- Firefox 88+: Full support
- Safari 14+: Partial support (WebXR limited)

## Known Limitations

- AR overlay rendering not yet implemented (task 17.4)
- Audio guidance not yet implemented
- WebXR support varies by browser
- Camera access requires HTTPS (except localhost)

## Next Steps

To extend the demo:

1. Implement full AR overlay rendering with three.js
2. Add audio guidance with Web Speech API
3. Integrate real hazard detection with TensorFlow.js
4. Add touch gestures for mobile devices
5. Implement route planning with real map data

## Requirements Validation

This demo validates the following requirements:

- **1.1**: Camera frame capture and brightness analysis
- **2.1**: CV pipeline frame processing
- **2.2**: Hazard detection and classification
- **3.1**: Navigation graph and route display
- **4.1**: AR overlay visualization (simulated)
- **5.1**: Audio guidance controls (UI only)
- **6.1**: Energy mode management
- **9.1, 9.2**: SDK module integration and independence
- **9.3**: Documentation and examples

## License

MIT
