/**
 * Error Handling Infrastructure for NightShift Navigator
 * Provides centralized error handling, recovery strategies, and logging
 */

export type ErrorType =
  | 'sensor_error'
  | 'processing_error'
  | 'navigation_error'
  | 'rendering_error'
  | 'integration_error';

export type ErrorSeverity = 'critical' | 'warning' | 'info';

export type RecoveryAction = 'recovered' | 'degraded' | 'failed';

/**
 * System error representation
 */
export interface SystemError {
  type: ErrorType;
  severity: ErrorSeverity;
  component: string;
  message: string;
  context: Record<string, any>;
  timestamp: number;
  stack?: string;
}

/**
 * Result of error recovery attempt
 */
export interface RecoveryResult {
  success: boolean;
  action: RecoveryAction;
  message: string;
}

/**
 * Recovery strategy function type
 */
export type RecoveryStrategy = (error: SystemError) => Promise<RecoveryResult>;

/**
 * Error handler interface
 */
export interface ErrorHandler {
  handleError(error: SystemError): Promise<RecoveryResult>;
  registerRecoveryStrategy(errorType: string, strategy: RecoveryStrategy): void;
  getErrorLog(): SystemError[];
  clearErrorLog(): void;
}

/**
 * Error logger interface
 */
export interface ErrorLogger {
  log(error: SystemError): void;
  getErrors(filter?: Partial<SystemError>): SystemError[];
  clear(): void;
  export(): string;
}

/**
 * Default error logger implementation
 */
/**
 * Default error logger implementation
 * Logs errors to console with context and maintains error history
 */
export class DefaultErrorLogger implements ErrorLogger {
  private errors: SystemError[] = [];
  private maxErrors: number = 1000;

  log(error: SystemError): void {
    this.errors.push(error);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console based on severity
    if (error.severity === 'critical') {
      console.error(`[${error.component}] ${error.message}`, error.context);
    } else if (error.severity === 'warning') {
      console.warn(`[${error.component}] ${error.message}`, error.context);
    } else {
      console.info(`[${error.component}] ${error.message}`, error.context);
    }
  }

  getErrors(filter?: Partial<SystemError>): SystemError[] {
    if (!filter) {
      return [...this.errors];
    }

    return this.errors.filter(error => {
      return Object.entries(filter).every(([key, value]) => {
        return error[key as keyof SystemError] === value;
      });
    });
  }

  clear(): void {
    this.errors = [];
  }

  export(): string {
    return JSON.stringify(this.errors, null, 2);
  }
}

/**
 * Default error handler implementation with recovery strategy registry
 */
/**
 * Default error handler implementation
 * Handles errors with recovery strategies and fallback mechanisms
 */
export class DefaultErrorHandler implements ErrorHandler {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private logger: ErrorLogger;

  constructor(logger?: ErrorLogger) {
    this.logger = logger || new DefaultErrorLogger();
  }

  async handleError(error: SystemError): Promise<RecoveryResult> {
    // Log the error
    this.logger.log(error);

    // Try to find a recovery strategy
    const strategy = this.strategies.get(error.type) || 
                     this.strategies.get(`${error.type}:${error.component}`);

    if (strategy) {
      try {
        const result = await strategy(error);
        
        // Log recovery result
        this.logger.log({
          type: error.type,
          severity: 'info',
          component: 'ErrorHandler',
          message: `Recovery attempt: ${result.action}`,
          context: { originalError: error, result },
          timestamp: Date.now()
        });

        return result;
      } catch (recoveryError) {
        // Recovery strategy itself failed
        this.logger.log({
          type: error.type,
          severity: 'critical',
          component: 'ErrorHandler',
          message: 'Recovery strategy failed',
          context: { originalError: error, recoveryError },
          timestamp: Date.now()
        });

        return {
          success: false,
          action: 'failed',
          message: 'Recovery strategy failed'
        };
      }
    }

    // No recovery strategy available
    return {
      success: false,
      action: 'failed',
      message: 'No recovery strategy available'
    };
  }

  registerRecoveryStrategy(errorType: string, strategy: RecoveryStrategy): void {
    this.strategies.set(errorType, strategy);
  }

  getErrorLog(): SystemError[] {
    return this.logger.getErrors();
  }

  clearErrorLog(): void {
    this.logger.clear();
  }
}

/**
 * Helper function to create a SystemError
 */
export function createError(
  type: ErrorType,
  severity: ErrorSeverity,
  component: string,
  message: string,
  context: Record<string, any> = {}
): SystemError {
  return {
    type,
    severity,
    component,
    message,
    context,
    timestamp: Date.now(),
    stack: new Error().stack
  };
}

// Export error messaging utilities
export * from './error-messages';
