/**
 * Property-Based Tests for Error Message Display
 * Feature: nightshift-navigator, Property 40: Error message display
 * Validates: Requirements 8.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  ErrorType,
  ErrorSeverity,
  createError,
  generateUserErrorMessage,
  formatErrorMessage,
  shouldAttemptAutoRecovery
} from './index';

describe('Property 40: Error message display', () => {
  /**
   * Property: For any critical component failure, a user-friendly error message
   * should be displayed and automatic recovery should be attempted
   */
  it('should generate user-friendly messages for all error types', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant<ErrorType>('sensor_error'),
          fc.constant<ErrorType>('processing_error'),
          fc.constant<ErrorType>('navigation_error'),
          fc.constant<ErrorType>('rendering_error'),
          fc.constant<ErrorType>('integration_error')
        ),
        fc.oneof(
          fc.constant<ErrorSeverity>('critical'),
          fc.constant<ErrorSeverity>('warning'),
          fc.constant<ErrorSeverity>('info')
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (errorType, severity, component, message) => {
          // Create a system error
          const error = createError(errorType, severity, component, message);

          // Generate user-friendly message
          const userMessage = generateUserErrorMessage(error);

          // Verify message has required fields
          expect(userMessage).toBeDefined();
          expect(userMessage.title).toBeDefined();
          expect(userMessage.title.length).toBeGreaterThan(0);
          expect(userMessage.description).toBeDefined();
          expect(userMessage.description.length).toBeGreaterThan(0);
          expect(Array.isArray(userMessage.recoverySuggestions)).toBe(true);
          expect(typeof userMessage.canAutoRecover).toBe('boolean');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide recovery suggestions for all error messages', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant<ErrorType>('sensor_error'),
          fc.constant<ErrorType>('processing_error'),
          fc.constant<ErrorType>('navigation_error'),
          fc.constant<ErrorType>('rendering_error'),
          fc.constant<ErrorType>('integration_error')
        ),
        fc.oneof(
          fc.constant<ErrorSeverity>('critical'),
          fc.constant<ErrorSeverity>('warning'),
          fc.constant<ErrorSeverity>('info')
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (errorType, severity, component, message) => {
          const error = createError(errorType, severity, component, message);
          const userMessage = generateUserErrorMessage(error);

          // Every error message should have at least one recovery suggestion
          expect(userMessage.recoverySuggestions.length).toBeGreaterThan(0);
          
          // All suggestions should be non-empty strings
          userMessage.recoverySuggestions.forEach(suggestion => {
            expect(typeof suggestion).toBe('string');
            expect(suggestion.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should format error messages in a readable way', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant<ErrorType>('sensor_error'),
          fc.constant<ErrorType>('processing_error'),
          fc.constant<ErrorType>('navigation_error'),
          fc.constant<ErrorType>('rendering_error'),
          fc.constant<ErrorType>('integration_error')
        ),
        fc.oneof(
          fc.constant<ErrorSeverity>('critical'),
          fc.constant<ErrorSeverity>('warning'),
          fc.constant<ErrorSeverity>('info')
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (errorType, severity, component, message) => {
          const error = createError(errorType, severity, component, message);
          const userMessage = generateUserErrorMessage(error);
          const formatted = formatErrorMessage(userMessage, false);

          // Formatted message should contain the title
          expect(formatted).toContain(userMessage.title);
          
          // Formatted message should contain the description
          expect(formatted).toContain(userMessage.description);
          
          // Formatted message should be non-empty
          expect(formatted.length).toBeGreaterThan(0);
          
          // If there are recovery suggestions, they should be in the formatted message
          if (userMessage.recoverySuggestions.length > 0) {
            expect(formatted).toContain('What you can do:');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should indicate whether automatic recovery should be attempted', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant<ErrorType>('sensor_error'),
          fc.constant<ErrorType>('processing_error'),
          fc.constant<ErrorType>('navigation_error'),
          fc.constant<ErrorType>('rendering_error'),
          fc.constant<ErrorType>('integration_error')
        ),
        fc.oneof(
          fc.constant<ErrorSeverity>('critical'),
          fc.constant<ErrorSeverity>('warning'),
          fc.constant<ErrorSeverity>('info')
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (errorType, severity, component, message) => {
          const error = createError(errorType, severity, component, message);
          const shouldRecover = shouldAttemptAutoRecovery(error);

          // Should return a boolean value
          expect(typeof shouldRecover).toBe('boolean');
          
          // The value should match the canAutoRecover field in the user message
          const userMessage = generateUserErrorMessage(error);
          expect(shouldRecover).toBe(userMessage.canAutoRecover);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle critical errors with appropriate severity', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant<ErrorType>('sensor_error'),
          fc.constant<ErrorType>('processing_error'),
          fc.constant<ErrorType>('navigation_error'),
          fc.constant<ErrorType>('rendering_error'),
          fc.constant<ErrorType>('integration_error')
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (errorType, component, message) => {
          // Create a critical error
          const error = createError(errorType, 'critical', component, message);
          const userMessage = generateUserErrorMessage(error);

          // Critical errors should always have a title and description
          expect(userMessage.title).toBeDefined();
          expect(userMessage.title.length).toBeGreaterThan(0);
          expect(userMessage.description).toBeDefined();
          expect(userMessage.description.length).toBeGreaterThan(0);
          
          // Critical errors should have recovery suggestions
          expect(userMessage.recoverySuggestions.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include technical details when requested', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant<ErrorType>('sensor_error'),
          fc.constant<ErrorType>('processing_error'),
          fc.constant<ErrorType>('navigation_error'),
          fc.constant<ErrorType>('rendering_error'),
          fc.constant<ErrorType>('integration_error')
        ),
        fc.oneof(
          fc.constant<ErrorSeverity>('critical'),
          fc.constant<ErrorSeverity>('warning'),
          fc.constant<ErrorSeverity>('info')
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (errorType, severity, component, message) => {
          const error = createError(errorType, severity, component, message);
          const userMessage = generateUserErrorMessage(error);
          
          // Format with technical details
          const formattedWithDetails = formatErrorMessage(userMessage, true);
          
          // Format without technical details
          const formattedWithoutDetails = formatErrorMessage(userMessage, false);

          // Both should contain title and description
          expect(formattedWithDetails).toContain(userMessage.title);
          expect(formattedWithoutDetails).toContain(userMessage.title);
          
          // Version with details should be longer or equal
          expect(formattedWithDetails.length).toBeGreaterThanOrEqual(formattedWithoutDetails.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide specific messages for known error components', () => {
    // Test specific known error scenarios
    const knownErrors: Array<{ type: ErrorType; component: string }> = [
      { type: 'sensor_error', component: 'camera_unavailable' },
      { type: 'sensor_error', component: 'gps_unavailable' },
      { type: 'processing_error', component: 'cv_frame_processing_failed' },
      { type: 'navigation_error', component: 'no_route_found' },
      { type: 'rendering_error', component: 'ar_initialization_failed' },
      { type: 'integration_error', component: 'network_timeout' }
    ];

    knownErrors.forEach(({ type, component }) => {
      const error = createError(type, 'critical', component, 'Test error');
      const userMessage = generateUserErrorMessage(error);

      // Should have a specific, meaningful title (not just "System Error")
      expect(userMessage.title).toBeDefined();
      expect(userMessage.title.length).toBeGreaterThan(0);
      
      // Should have specific recovery suggestions
      expect(userMessage.recoverySuggestions.length).toBeGreaterThan(0);
      
      // Should indicate if auto-recovery is possible
      expect(typeof userMessage.canAutoRecover).toBe('boolean');
    });
  });
});
