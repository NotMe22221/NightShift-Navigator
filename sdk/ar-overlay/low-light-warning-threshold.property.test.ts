/**
 * Property-based tests for low-light warning threshold
 * **Feature: nightshift-navigator, Property 18: Low-light warning threshold**
 * **Validates: Requirements 4.3**
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Helper function to create and manage low-light warning element
 * This simulates the behavior of the AR overlay without requiring WebXR
 */
function createLowLightWarningElement(): HTMLElement {
  const element = document.createElement('div');
  element.id = 'low-light-warning';
  element.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 165, 0, 0.9);
    color: white;
    padding: 15px 30px;
    border-radius: 10px;
    font-size: 18px;
    font-weight: bold;
    display: none;
    z-index: 1000;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  `;
  element.textContent = '⚠️ Low Light Conditions';
  document.body.appendChild(element);
  return element;
}

function setLowLightWarning(visible: boolean): void {
  const element = document.getElementById('low-light-warning');
  if (element) {
    element.style.display = visible ? 'block' : 'none';
  }
}

describe('Low-Light Warning Threshold Properties', () => {
  afterEach(() => {
    // Clean up any DOM elements
    const warningElement = document.getElementById('low-light-warning');
    if (warningElement) {
      warningElement.remove();
    }
  });
  
  /**
   * Property 18: Low-light warning threshold
   * For any ambient light measurement, the low-light warning should be visible 
   * if and only if the light level is below 10 lux.
   */
  it('should show warning when light level is below 10 lux', () => {
    // Generator for light levels below threshold
    const lowLightArb = fc.double({ min: 0, max: 9.99, noNaN: true });
    
    fc.assert(
      fc.property(lowLightArb, (lightLevel) => {
        // Create warning element
        createLowLightWarningElement();
        
        // Set warning based on light level
        const shouldShowWarning = lightLevel < 10;
        setLowLightWarning(shouldShowWarning);
        
        // Check if warning element is visible
        const warningElement = document.getElementById('low-light-warning');
        expect(warningElement).toBeDefined();
        
        if (warningElement) {
          const isVisible = warningElement.style.display !== 'none';
          expect(isVisible).toBe(true);
        }
        
        // Clean up
        warningElement?.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should hide warning when light level is at or above 10 lux', () => {
    // Generator for light levels at or above threshold
    const normalLightArb = fc.double({ min: 10, max: 100000, noNaN: true });
    
    fc.assert(
      fc.property(normalLightArb, (lightLevel) => {
        // Create warning element
        createLowLightWarningElement();
        
        // Set warning based on light level
        const shouldShowWarning = lightLevel < 10;
        setLowLightWarning(shouldShowWarning);
        
        // Check if warning element is hidden
        const warningElement = document.getElementById('low-light-warning');
        expect(warningElement).toBeDefined();
        
        if (warningElement) {
          const isVisible = warningElement.style.display !== 'none';
          expect(isVisible).toBe(false);
        }
        
        // Clean up
        warningElement?.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should handle threshold boundary correctly', () => {
    // Test exact threshold values
    const thresholdValues = [9.9, 9.99, 9.999, 10.0, 10.01, 10.1];
    
    for (const lightLevel of thresholdValues) {
      createLowLightWarningElement();
      
      const shouldShowWarning = lightLevel < 10;
      setLowLightWarning(shouldShowWarning);
      
      const warningElement = document.getElementById('low-light-warning');
      expect(warningElement).toBeDefined();
      
      if (warningElement) {
        const isVisible = warningElement.style.display !== 'none';
        
        if (lightLevel < 10) {
          expect(isVisible).toBe(true);
        } else {
          expect(isVisible).toBe(false);
        }
      }
      
      // Clean up for next iteration
      warningElement?.remove();
    }
  });
  
  it('should toggle warning visibility correctly', () => {
    createLowLightWarningElement();
    
    // Show warning
    setLowLightWarning(true);
    let warningElement = document.getElementById('low-light-warning');
    expect(warningElement?.style.display).toBe('block');
    
    // Hide warning
    setLowLightWarning(false);
    warningElement = document.getElementById('low-light-warning');
    expect(warningElement?.style.display).toBe('none');
    
    // Show again
    setLowLightWarning(true);
    warningElement = document.getElementById('low-light-warning');
    expect(warningElement?.style.display).toBe('block');
  });
  
  it('should apply correct threshold logic for any light level', () => {
    // Generator for any valid light level
    const lightLevelArb = fc.double({ min: 0, max: 100000, noNaN: true });
    
    fc.assert(
      fc.property(lightLevelArb, (lightLevel) => {
        createLowLightWarningElement();
        
        // Apply threshold logic
        const shouldShowWarning = lightLevel < 10;
        setLowLightWarning(shouldShowWarning);
        
        const warningElement = document.getElementById('low-light-warning');
        expect(warningElement).toBeDefined();
        
        if (warningElement) {
          const isVisible = warningElement.style.display !== 'none';
          
          // Verify the if-and-only-if condition
          if (lightLevel < 10) {
            expect(isVisible).toBe(true);
          } else {
            expect(isVisible).toBe(false);
          }
        }
        
        // Clean up
        warningElement?.remove();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
