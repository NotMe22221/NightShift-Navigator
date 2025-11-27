/**
 * Control Panel Component
 * Manages UI controls and user interactions
 */

export type EnergyMode = 'normal' | 'low_power' | 'critical';
export type Scenario = 'none' | 'low-light' | 'obstacles' | 'shadows' | 'night';

/**
 * ControlPanel manages all UI controls and emits events for user actions
 */
export class ControlPanel {
  private startCameraBtn: HTMLButtonElement | null = null;
  private stopCameraBtn: HTMLButtonElement | null = null;
  private scenarioSelect: HTMLSelectElement | null = null;
  private applyScenarioBtn: HTMLButtonElement | null = null;
  private toggleCVCheckbox: HTMLInputElement | null = null;
  private toggleARCheckbox: HTMLInputElement | null = null;
  private toggleAudioCheckbox: HTMLInputElement | null = null;
  private energyModeSelect: HTMLSelectElement | null = null;
  private batteryLevelInput: HTMLInputElement | null = null;
  private batteryValueSpan: HTMLSpanElement | null = null;
  private startRouteBtn: HTMLButtonElement | null = null;
  private stopRouteBtn: HTMLButtonElement | null = null;
  private simulateHazardBtn: HTMLButtonElement | null = null;

  // Event handlers
  private startCameraHandler: (() => void) | null = null;
  private stopCameraHandler: (() => void) | null = null;
  private applyScenarioHandler: ((scenario: Scenario) => void) | null = null;
  private toggleCVHandler: ((enabled: boolean) => void) | null = null;
  private toggleARHandler: ((enabled: boolean) => void) | null = null;
  private toggleAudioHandler: ((enabled: boolean) => void) | null = null;
  private energyModeChangeHandler: ((mode: EnergyMode) => void) | null = null;
  private batteryLevelChangeHandler: ((level: number) => void) | null = null;
  private startRouteHandler: (() => void) | null = null;
  private stopRouteHandler: (() => void) | null = null;
  private simulateHazardHandler: (() => void) | null = null;

  /**
   * Initialize the control panel
   */
  initialize(): void {
    // Get DOM elements
    this.startCameraBtn = document.getElementById('start-camera') as HTMLButtonElement;
    this.stopCameraBtn = document.getElementById('stop-camera') as HTMLButtonElement;
    this.scenarioSelect = document.getElementById('scenario-select') as HTMLSelectElement;
    this.applyScenarioBtn = document.getElementById('apply-scenario') as HTMLButtonElement;
    this.toggleCVCheckbox = document.getElementById('toggle-cv') as HTMLInputElement;
    this.toggleARCheckbox = document.getElementById('toggle-ar') as HTMLInputElement;
    this.toggleAudioCheckbox = document.getElementById('toggle-audio') as HTMLInputElement;
    this.energyModeSelect = document.getElementById('energy-mode') as HTMLSelectElement;
    this.batteryLevelInput = document.getElementById('battery-level') as HTMLInputElement;
    this.batteryValueSpan = document.getElementById('battery-value') as HTMLSpanElement;
    this.startRouteBtn = document.getElementById('start-route') as HTMLButtonElement;
    this.stopRouteBtn = document.getElementById('stop-route') as HTMLButtonElement;
    this.simulateHazardBtn = document.getElementById('simulate-hazard') as HTMLButtonElement;

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for all controls
   */
  private setupEventListeners(): void {
    this.startCameraBtn?.addEventListener('click', () => {
      this.startCameraHandler?.();
    });

    this.stopCameraBtn?.addEventListener('click', () => {
      this.stopCameraHandler?.();
    });

    this.applyScenarioBtn?.addEventListener('click', () => {
      const scenario = this.scenarioSelect?.value as Scenario;
      this.applyScenarioHandler?.(scenario);
    });

    this.toggleCVCheckbox?.addEventListener('change', () => {
      this.toggleCVHandler?.(this.toggleCVCheckbox?.checked ?? false);
    });

    this.toggleARCheckbox?.addEventListener('change', () => {
      this.toggleARHandler?.(this.toggleARCheckbox?.checked ?? false);
    });

    this.toggleAudioCheckbox?.addEventListener('change', () => {
      this.toggleAudioHandler?.(this.toggleAudioCheckbox?.checked ?? false);
    });

    this.energyModeSelect?.addEventListener('change', () => {
      const mode = this.energyModeSelect?.value as EnergyMode;
      this.energyModeChangeHandler?.(mode);
    });

    this.batteryLevelInput?.addEventListener('input', () => {
      const level = parseInt(this.batteryLevelInput?.value ?? '100', 10);
      if (this.batteryValueSpan) {
        this.batteryValueSpan.textContent = level.toString();
      }
      this.batteryLevelChangeHandler?.(level);
    });

    this.startRouteBtn?.addEventListener('click', () => {
      this.startRouteHandler?.();
      this.setRouteActive(true);
    });

    this.stopRouteBtn?.addEventListener('click', () => {
      this.stopRouteHandler?.();
      this.setRouteActive(false);
    });

    this.simulateHazardBtn?.addEventListener('click', () => {
      this.simulateHazardHandler?.();
    });
  }

  // Event handler registration methods
  onStartCamera(handler: () => void): void {
    this.startCameraHandler = handler;
  }

  onStopCamera(handler: () => void): void {
    this.stopCameraHandler = handler;
  }

  onApplyScenario(handler: (scenario: Scenario) => void): void {
    this.applyScenarioHandler = handler;
  }

  onToggleCV(handler: (enabled: boolean) => void): void {
    this.toggleCVHandler = handler;
  }

  onToggleAR(handler: (enabled: boolean) => void): void {
    this.toggleARHandler = handler;
  }

  onToggleAudio(handler: (enabled: boolean) => void): void {
    this.toggleAudioHandler = handler;
  }

  onEnergyModeChange(handler: (mode: EnergyMode) => void): void {
    this.energyModeChangeHandler = handler;
  }

  onBatteryLevelChange(handler: (level: number) => void): void {
    this.batteryLevelChangeHandler = handler;
  }

  onStartRoute(handler: () => void): void {
    this.startRouteHandler = handler;
  }

  onStopRoute(handler: () => void): void {
    this.stopRouteHandler = handler;
  }

  onSimulateHazard(handler: () => void): void {
    this.simulateHazardHandler = handler;
  }

  // State management methods
  setCameraActive(active: boolean): void {
    if (this.startCameraBtn) {
      this.startCameraBtn.disabled = active;
    }
    if (this.stopCameraBtn) {
      this.stopCameraBtn.disabled = !active;
    }
  }

  setRouteActive(active: boolean): void {
    if (this.startRouteBtn) {
      this.startRouteBtn.disabled = active;
    }
    if (this.stopRouteBtn) {
      this.stopRouteBtn.disabled = !active;
    }
  }
}
