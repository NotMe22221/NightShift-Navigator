/**
 * Property-Based Tests for Async Pattern Support
 * 
 * **Feature: nightshift-navigator, Property 45: Async pattern support**
 * **Validates: Requirements 9.5**
 * 
 * Property: Async pattern support
 * For any asynchronous SDK operation, both callback-based and Promise-based 
 * patterns should work correctly.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  DualAsyncOperation,
  fromPromise,
  createDualAsync,
  DualEventEmitter
} from './async-patterns.js';

describe('Property 45: Async pattern support', () => {
  describe('DualAsyncOperation', () => {
    it('property: Promise-based pattern should resolve with correct value', () => {
      fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (value) => {
            // Create operation
            const operation = new DualAsyncOperation<any>();
            
            // Complete with value
            operation.complete(value);
            
            // Promise should resolve with the same value
            const result = await operation.toPromise();
            expect(result).toEqual(value);
            
            return result === value || JSON.stringify(result) === JSON.stringify(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: callback-based pattern should receive correct value', () => {
      fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (value) => {
            // Create operation
            const operation = new DualAsyncOperation<any>();
            
            // Register callback
            let callbackResult: any;
            let callbackCalled = false;
            
            operation.onComplete((result) => {
              callbackResult = result;
              callbackCalled = true;
            });
            
            // Complete with value
            operation.complete(value);
            
            // Wait for callback to be called
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Callback should have been called with the same value
            expect(callbackCalled).toBe(true);
            expect(callbackResult).toEqual(value);
            
            return callbackCalled && (callbackResult === value || JSON.stringify(callbackResult) === JSON.stringify(value));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: both patterns should receive the same value', () => {
      fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (value) => {
            // Create operation
            const operation = new DualAsyncOperation<any>();
            
            // Register callback
            let callbackResult: any;
            operation.onComplete((result) => {
              callbackResult = result;
            });
            
            // Complete with value
            operation.complete(value);
            
            // Get Promise result
            const promiseResult = await operation.toPromise();
            
            // Wait for callback
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Both should receive the same value
            expect(promiseResult).toEqual(value);
            expect(callbackResult).toEqual(value);
            expect(promiseResult).toEqual(callbackResult);
            
            return JSON.stringify(promiseResult) === JSON.stringify(callbackResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: Promise-based pattern should reject with correct error', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (errorMessage) => {
            // Create operation
            const operation = new DualAsyncOperation<any>();
            
            // Fail with error
            const error = new Error(errorMessage);
            operation.fail(error);
            
            // Promise should reject with the same error
            try {
              await operation.toPromise();
              return false; // Should not reach here
            } catch (err) {
              expect(err).toBeInstanceOf(Error);
              expect((err as Error).message).toBe(errorMessage);
              return (err as Error).message === errorMessage;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: callback-based error pattern should receive correct error', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (errorMessage) => {
            // Create operation
            const operation = new DualAsyncOperation<any>();
            
            // Register error callback
            let errorCallbackResult: Error | undefined;
            let errorCallbackCalled = false;
            
            operation.onError((err) => {
              errorCallbackResult = err;
              errorCallbackCalled = true;
            });
            
            // Fail with error
            const error = new Error(errorMessage);
            operation.fail(error);
            
            // Wait for callback to be called
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Error callback should have been called with the same error
            expect(errorCallbackCalled).toBe(true);
            expect(errorCallbackResult).toBeInstanceOf(Error);
            expect(errorCallbackResult?.message).toBe(errorMessage);
            
            return errorCallbackCalled && errorCallbackResult?.message === errorMessage;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: both error patterns should receive the same error', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (errorMessage) => {
            // Create operation
            const operation = new DualAsyncOperation<any>();
            
            // Register error callback
            let callbackError: Error | undefined;
            operation.onError((err) => {
              callbackError = err;
            });
            
            // Fail with error
            const error = new Error(errorMessage);
            operation.fail(error);
            
            // Get Promise error
            let promiseError: Error | undefined;
            try {
              await operation.toPromise();
            } catch (err) {
              promiseError = err as Error;
            }
            
            // Wait for callback
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Both should receive the same error
            expect(promiseError).toBeInstanceOf(Error);
            expect(callbackError).toBeInstanceOf(Error);
            expect(promiseError?.message).toBe(errorMessage);
            expect(callbackError?.message).toBe(errorMessage);
            expect(promiseError?.message).toBe(callbackError?.message);
            
            return promiseError?.message === callbackError?.message;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: callbacks registered after completion should be called immediately', () => {
      fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (value) => {
            // Create and complete operation
            const operation = new DualAsyncOperation<any>();
            operation.complete(value);
            
            // Wait for completion
            await operation.toPromise();
            
            // Register callback after completion
            let callbackResult: any;
            let callbackCalled = false;
            
            operation.onComplete((result) => {
              callbackResult = result;
              callbackCalled = true;
            });
            
            // Callback should be called immediately (synchronously or very quickly)
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(callbackCalled).toBe(true);
            expect(callbackResult).toEqual(value);
            
            return callbackCalled;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: error callbacks registered after failure should be called immediately', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (errorMessage) => {
            // Create and fail operation
            const operation = new DualAsyncOperation<any>();
            const error = new Error(errorMessage);
            operation.fail(error);
            
            // Wait for failure
            try {
              await operation.toPromise();
            } catch (err) {
              // Expected
            }
            
            // Register error callback after failure
            let errorCallbackResult: Error | undefined;
            let errorCallbackCalled = false;
            
            operation.onError((err) => {
              errorCallbackResult = err;
              errorCallbackCalled = true;
            });
            
            // Error callback should be called immediately
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(errorCallbackCalled).toBe(true);
            expect(errorCallbackResult?.message).toBe(errorMessage);
            
            return errorCallbackCalled;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: multiple callbacks should all receive the value', () => {
      fc.assert(
        fc.asyncProperty(
          fc.anything(),
          fc.integer({ min: 1, max: 10 }),
          async (value, callbackCount) => {
            // Create operation
            const operation = new DualAsyncOperation<any>();
            
            // Register multiple callbacks
            const results: any[] = [];
            for (let i = 0; i < callbackCount; i++) {
              operation.onComplete((result) => {
                results.push(result);
              });
            }
            
            // Complete with value
            operation.complete(value);
            
            // Wait for all callbacks
            await new Promise(resolve => setTimeout(resolve, 20));
            
            // All callbacks should have been called with the same value
            expect(results.length).toBe(callbackCount);
            results.forEach(result => {
              expect(result).toEqual(value);
            });
            
            return results.length === callbackCount;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('fromPromise utility', () => {
    it('property: fromPromise should create operation that resolves correctly', () => {
      fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (value) => {
            // Create Promise
            const promise = Promise.resolve(value);
            
            // Create operation from Promise
            const operation = fromPromise(promise);
            
            // Both patterns should work
            const promiseResult = await operation.toPromise();
            
            let callbackResult: any;
            operation.onComplete((result) => {
              callbackResult = result;
            });
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(promiseResult).toEqual(value);
            expect(callbackResult).toEqual(value);
            
            return JSON.stringify(promiseResult) === JSON.stringify(callbackResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: fromPromise should create operation that rejects correctly', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (errorMessage) => {
            // Create rejecting Promise
            const promise = Promise.reject(new Error(errorMessage));
            
            // Create operation from Promise
            const operation = fromPromise(promise);
            
            // Promise pattern should reject
            let promiseError: Error | undefined;
            try {
              await operation.toPromise();
            } catch (err) {
              promiseError = err as Error;
            }
            
            // Callback pattern should receive error
            let callbackError: Error | undefined;
            operation.onError((err) => {
              callbackError = err;
            });
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(promiseError?.message).toBe(errorMessage);
            expect(callbackError?.message).toBe(errorMessage);
            
            return promiseError?.message === callbackError?.message;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('createDualAsync utility', () => {
    it('property: createDualAsync should support both patterns', () => {
      fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (value) => {
            // Create operation with executor
            const operation = createDualAsync<any>((resolve, reject) => {
              setTimeout(() => resolve(value), 5);
            });
            
            // Both patterns should work
            const promiseResult = await operation.toPromise();
            
            let callbackResult: any;
            operation.onComplete((result) => {
              callbackResult = result;
            });
            
            await new Promise(resolve => setTimeout(resolve, 20));
            
            expect(promiseResult).toEqual(value);
            expect(callbackResult).toEqual(value);
            
            return JSON.stringify(promiseResult) === JSON.stringify(callbackResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: createDualAsync should handle errors in both patterns', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (errorMessage) => {
            // Create operation with executor that rejects
            const operation = createDualAsync<any>((resolve, reject) => {
              setTimeout(() => reject(new Error(errorMessage)), 5);
            });
            
            // Promise pattern should reject
            let promiseError: Error | undefined;
            try {
              await operation.toPromise();
            } catch (err) {
              promiseError = err as Error;
            }
            
            // Callback pattern should receive error
            let callbackError: Error | undefined;
            operation.onError((err) => {
              callbackError = err;
            });
            
            await new Promise(resolve => setTimeout(resolve, 20));
            
            expect(promiseError?.message).toBe(errorMessage);
            expect(callbackError?.message).toBe(errorMessage);
            
            return promiseError?.message === callbackError?.message;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('DualEventEmitter', () => {
    it('property: callback pattern should receive all emitted values', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.anything(), { minLength: 1, maxLength: 20 }),
          async (values) => {
            // Create emitter
            const emitter = new DualEventEmitter<any>();
            
            // Register callback
            const received: any[] = [];
            emitter.on((value) => {
              received.push(value);
            });
            
            // Emit all values
            for (const value of values) {
              emitter.emit(value);
            }
            
            // Wait for callbacks
            await new Promise(resolve => setTimeout(resolve, 20));
            
            // All values should have been received
            expect(received.length).toBe(values.length);
            for (let i = 0; i < values.length; i++) {
              expect(received[i]).toEqual(values[i]);
            }
            
            return received.length === values.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: multiple callbacks should all receive emitted values', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.anything(), { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 2, max: 5 }),
          async (values, listenerCount) => {
            // Create emitter
            const emitter = new DualEventEmitter<any>();
            
            // Register multiple callbacks
            const results: any[][] = [];
            for (let i = 0; i < listenerCount; i++) {
              const received: any[] = [];
              results.push(received);
              emitter.on((value) => {
                received.push(value);
              });
            }
            
            // Emit all values
            for (const value of values) {
              emitter.emit(value);
            }
            
            // Wait for callbacks
            await new Promise(resolve => setTimeout(resolve, 20));
            
            // All listeners should have received all values
            for (const received of results) {
              expect(received.length).toBe(values.length);
              for (let i = 0; i < values.length; i++) {
                expect(received[i]).toEqual(values[i]);
              }
            }
            
            return results.every(r => r.length === values.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: unsubscribe should stop receiving values', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.anything(), { minLength: 2, maxLength: 20 }),
          fc.integer({ min: 1, max: 19 }),
          async (values, unsubscribeIndex) => {
            // Ensure unsubscribe happens before the end
            if (unsubscribeIndex >= values.length) {
              unsubscribeIndex = Math.floor(values.length / 2);
            }
            
            // Create emitter
            const emitter = new DualEventEmitter<any>();
            
            // Register callback
            const received: any[] = [];
            const unsubscribe = emitter.on((value) => {
              received.push(value);
            });
            
            // Emit values up to unsubscribe point
            for (let i = 0; i < unsubscribeIndex; i++) {
              emitter.emit(values[i]);
            }
            
            // Wait for callbacks
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Unsubscribe
            unsubscribe();
            
            // Emit remaining values
            for (let i = unsubscribeIndex; i < values.length; i++) {
              emitter.emit(values[i]);
            }
            
            // Wait for any potential callbacks
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Should only have received values before unsubscribe
            expect(received.length).toBe(unsubscribeIndex);
            
            return received.length === unsubscribeIndex;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: removeAllListeners should stop all callbacks', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.anything(), { minLength: 2, maxLength: 20 }),
          fc.integer({ min: 2, max: 5 }),
          fc.integer({ min: 1, max: 19 }),
          async (values, listenerCount, removeIndex) => {
            // Ensure remove happens before the end
            if (removeIndex >= values.length) {
              removeIndex = Math.floor(values.length / 2);
            }
            
            // Create emitter
            const emitter = new DualEventEmitter<any>();
            
            // Register multiple callbacks
            const results: any[][] = [];
            for (let i = 0; i < listenerCount; i++) {
              const received: any[] = [];
              results.push(received);
              emitter.on((value) => {
                received.push(value);
              });
            }
            
            // Emit values up to remove point
            for (let i = 0; i < removeIndex; i++) {
              emitter.emit(values[i]);
            }
            
            // Wait for callbacks
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Remove all listeners
            emitter.removeAllListeners();
            
            // Emit remaining values
            for (let i = removeIndex; i < values.length; i++) {
              emitter.emit(values[i]);
            }
            
            // Wait for any potential callbacks
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // All listeners should only have received values before remove
            for (const received of results) {
              expect(received.length).toBe(removeIndex);
            }
            
            return results.every(r => r.length === removeIndex);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Integration: Real-world async patterns', () => {
    it('property: simulated async operation with both patterns', () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 50 }),
          async (input, delay) => {
            // Simulate an async operation (e.g., sensor reading)
            const operation = createDualAsync<number>((resolve) => {
              setTimeout(() => resolve(input * 2), delay);
            });
            
            // Use Promise pattern
            const promiseResult = await operation.toPromise();
            
            // Use callback pattern
            let callbackResult: number | undefined;
            operation.onComplete((result) => {
              callbackResult = result;
            });
            
            await new Promise(resolve => setTimeout(resolve, delay + 20));
            
            // Both should produce the same result
            expect(promiseResult).toBe(input * 2);
            expect(callbackResult).toBe(input * 2);
            
            return promiseResult === callbackResult;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: chaining operations with both patterns', () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          async (input) => {
            // First operation
            const op1 = createDualAsync<number>((resolve) => {
              setTimeout(() => resolve(input + 10), 5);
            });
            
            // Wait for first operation
            const result1 = await op1.toPromise();
            
            // Second operation using result from first
            const op2 = createDualAsync<number>((resolve) => {
              setTimeout(() => resolve(result1 * 2), 5);
            });
            
            // Use both patterns for second operation
            const promiseResult = await op2.toPromise();
            
            let callbackResult: number | undefined;
            op2.onComplete((result) => {
              callbackResult = result;
            });
            
            await new Promise(resolve => setTimeout(resolve, 20));
            
            // Both should produce the same final result
            const expected = (input + 10) * 2;
            expect(promiseResult).toBe(expected);
            expect(callbackResult).toBe(expected);
            
            return promiseResult === callbackResult && promiseResult === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
