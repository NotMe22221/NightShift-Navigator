/**
 * NightShift Navigator Demo Application
 * Demonstrates the SDK capabilities with simulated scenarios
 */

import { DemoApp } from './components/DemoApp';

console.log('NightShift Navigator Demo - Initializing...');

// Initialize demo application
const app = new DemoApp();
app.initialize().catch((error) => {
  console.error('Failed to initialize demo:', error);
  const messagesEl = document.getElementById('messages');
  if (messagesEl) {
    messagesEl.innerHTML = `
      <div class="error-message">
        Failed to initialize demo: ${error.message}
      </div>
    `;
  }
});
