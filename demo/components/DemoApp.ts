/**
 * Main Demo Application Controller
 * Integrates all SDK modules and manages UI interactions
 */

import { CameraController } from './CameraController';
import { ControlPanel } from './ControlPanel';
import { MetricsDisplay } from './MetricsDisplay';
import { ScenarioManager } from './ScenarioManager';

/**
 * DemoApp orchestrates all demo components and SDK modules
 */
export class DemoApp {
  private cameraController: CameraController;
  private controlPanel: ControlPanel;
  private metricsDisplay: MetricsDisplay;
  private scenarioManager: ScenarioManager;
  private initialized = false;

  constructor() {
    this.cameraController = new CameraController();
    this.controlPanel = new ControlPanel();
    this.metricsDisplay = new MetricsDisplay();
    this.scenarioManager = new ScenarioManager();
  }

  /**
   * Initialize the demo application
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('Initializing NightShift Navigator Demo...');

    try {
      // Initialize components
      await this.cameraController.initialize();
      this.controlPanel.initialize();
      this.metricsDisplay.initialize();
      this.scenarioManager.initialize(this.cameraController);

      // Wire up event handlers
      this.setupEventHandlers();

      this.initialized = true;
      this.showMessage('Demo initialized successfully. Click "Start Camera" to begin.', 'info');
      console.log('Demo initialization complete');
      
      // Show helpful tip about camera permissions
      setTimeout(() => {
        this.showMessage('💡 Tip: Allow camera permissions when prompted by your browser.', 'info');
      }, 2000);
    } catch (error) {
      console.error('Demo initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up event handlers for UI interactions
   */
  private setupEventHandlers(): void {
    // Camera controls
    this.controlPanel.onStartCamera(async () => {
      try {
        this.showMessage('Starting camera...', 'info');
        await this.cameraController.start();
      } catch (error: any) {
        console.error('Camera start error:', error);
        this.showMessage(error.message || 'Failed to start camera', 'error');
        this.controlPanel.setCameraActive(false);
      }
    });

    this.controlPanel.onStopCamera(() => {
      this.cameraController.stop();
    });

    // Scenario controls
    this.controlPanel.onApplyScenario((scenario) => {
      this.scenarioManager.applyScenario(scenario);
      this.showMessage(`Applied scenario: ${scenario}`, 'info');
    });

    // Module toggles
    this.controlPanel.onToggleCV((enabled) => {
      console.log('CV Pipeline:', enabled ? 'enabled' : 'disabled');
      this.updateModuleStatus('cv', enabled);
    });

    this.controlPanel.onToggleAR((enabled) => {
      console.log('AR Overlay:', enabled ? 'enabled' : 'disabled');
      this.updateModuleStatus('ar', enabled);
    });

    this.controlPanel.onToggleAudio((enabled) => {
      console.log('Audio:', enabled ? 'enabled' : 'disabled');
      this.updateModuleStatus('audio', enabled);
    });

    // Energy mode
    this.controlPanel.onEnergyModeChange((mode) => {
      console.log('Energy mode:', mode);
      this.scenarioManager.setEnergyMode(mode);
    });

    this.controlPanel.onBatteryLevelChange((level) => {
      this.scenarioManager.setBatteryLevel(level);
    });

    // Navigation controls
    this.controlPanel.onStartRoute(() => {
      this.scenarioManager.startRoute();
      this.showMessage('Navigation started', 'info');
      this.updateModuleStatus('nav', true);
    });

    this.controlPanel.onStopRoute(() => {
      this.scenarioManager.stopRoute();
      this.showMessage('Navigation stopped', 'info');
      this.updateModuleStatus('nav', false);
    });

    this.controlPanel.onSimulateHazard(() => {
      this.scenarioManager.simulateHazard();
      this.showMessage('Hazard simulated', 'info');
    });

    // Camera events
    this.cameraController.onStart(() => {
      this.controlPanel.setCameraActive(true);
      this.updateModuleStatus('camera', true);
      this.showMessage('Camera started', 'info');
    });

    this.cameraController.onStop(() => {
      this.controlPanel.setCameraActive(false);
      this.updateModuleStatus('camera', false);
      this.showMessage('Camera stopped', 'info');
    });

    this.cameraController.onFrame((frame) => {
      // Process frame through scenario manager
      this.scenarioManager.processFrame(frame);
    });

    // Metrics updates
    this.scenarioManager.onMetricsUpdate((metrics) => {
      this.metricsDisplay.update(metrics);
    });
  }

  /**
   * Update module status indicator
   */
  private updateModuleStatus(module: string, active: boolean): void {
    const statusEl = document.getElementById(`${module}-status`);
    if (statusEl) {
      if (active) {
        statusEl.classList.add('active');
      } else {
        statusEl.classList.remove('active');
      }
    }
  }

  /**
   * Show a message to the user
   */
  private showMessage(message: string, type: 'info' | 'error'): void {
    const messagesEl = document.getElementById('messages');
    if (!messagesEl) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = message;
    messagesEl.appendChild(messageDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }
}
