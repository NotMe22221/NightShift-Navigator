/**
 * Async Pattern Utilities
 * 
 * Provides utilities for supporting both callback-based and Promise-based async patterns.
 */

/**
 * Callback function type
 */
export type Callback<T> = (result: T) => void;
export type ErrorCallback = (error: Error) => void;

/**
 * Async operation that supports both callbacks and Promises
 */
/**
 * Dual async operation that supports both callbacks and promises
 * @template T The type of the result value
 */
export class DualAsyncOperation<T> {
  private promise: Promise<T>;
  private resolve!: (value: T) => void;
  private reject!: (error: Error) => void;
  private callbacks: Callback<T>[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private completed = false;
  private result?: T;
  private error?: Error;

  constructor(executor?: (resolve: (value: T) => void, reject: (error: Error) => void) => void) {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      
      if (executor) {
        executor(resolve, reject);
      }
    });

    // Store result/error when promise completes
    this.promise.then(
      (result) => {
        this.completed = true;
        this.result = result;
        this.callbacks.forEach(cb => cb(result));
      },
      (error) => {
        this.completed = true;
        this.error = error;
        this.errorCallbacks.forEach(cb => cb(error));
      }
    );
  }

  /**
   * Register a callback to be called when the operation completes
   * @param callback The callback function to invoke with the result
   * @returns This operation for chaining
   */
  onComplete(callback: Callback<T>): this {
    if (this.completed && this.result !== undefined) {
      // Already completed, call asynchronously to match promise behavior
      Promise.resolve().then(() => callback(this.result!));
    } else {
      this.callbacks.push(callback);
    }
    return this;
  }

  /**
   * Register a callback to be called if the operation fails
   * @param callback The callback function to invoke with the error
   * @returns This operation for chaining
   */
  onError(callback: ErrorCallback): this {
    if (this.completed && this.error !== undefined) {
      // Already failed, call asynchronously to match promise behavior
      Promise.resolve().then(() => callback(this.error!));
    } else {
      this.errorCallbacks.push(callback);
    }
    return this;
  }

  /**
   * Get the Promise for this operation
   * @returns A promise that resolves with the operation result
   */
  toPromise(): Promise<T> {
    return this.promise;
  }

  /**
   * Complete the operation with a result
   * @param result The result value to complete with
   */
  complete(result: T): void {
    this.resolve(result);
  }

  /**
   * Fail the operation with an error
   * @param error The error to fail with
   */
  fail(error: Error): void {
    this.reject(error);
  }
}

/**
 * Create a dual async operation from a Promise
 */
/**
 * Create a dual async operation from a promise
 * @template T The type of the result value
 * @param promise The promise to wrap
 * @returns A dual async operation
 */
export function fromPromise<T>(promise: Promise<T>): DualAsyncOperation<T> {
  const operation = new DualAsyncOperation<T>();
  
  promise.then(
    (result) => operation.complete(result),
    (error) => operation.fail(error)
  );
  
  return operation;
}

/**
 * Create a dual async operation from an executor function
 * @template T The type of the result value
 * @param executor The executor function that performs the async operation
 * @returns A dual async operation
 */
export function createDualAsync<T>(
  executor: (resolve: (value: T) => void, reject: (error: Error) => void) => void
): DualAsyncOperation<T> {
  return new DualAsyncOperation<T>(executor);
}

/**
 * Example usage:
 * 
 * ```typescript
 * // Promise-based usage
 * const result = await operation.toPromise();
 * 
 * // Callback-based usage
 * operation
 *   .onComplete(result => console.log('Success:', result))
 *   .onError(error => console.error('Error:', error));
 * ```
 */

/**
 * Event emitter that supports both callbacks and async iteration
 */
/**
 * Event emitter that supports both callbacks and promises
 * @template T The type of the event data
 */
export class DualEventEmitter<T> {
  private listeners: Callback<T>[] = [];
  private queue: T[] = [];
  private resolvers: Array<(value: IteratorResult<T>) => void> = [];

  /**
   * Register a callback listener
   * @param callback The callback function to invoke when events are emitted
   * @returns An unsubscribe function to remove the listener
   */
  on(callback: Callback<T>): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event
   * @param value The event value to emit to all listeners
   */
  emit(value: T): void {
    // Call all listeners
    this.listeners.forEach(listener => listener(value));
    
    // Handle async iteration
    if (this.resolvers.length > 0) {
      const resolver = this.resolvers.shift()!;
      resolver({ value, done: false });
    } else {
      this.queue.push(value);
    }
  }

  /**
   * Get an async iterator for this emitter
   * @returns An async iterator that yields emitted values
   */
  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    while (true) {
      if (this.queue.length > 0) {
        yield this.queue.shift()!;
      } else {
        const value = await new Promise<T>((resolve) => {
          this.resolvers.push((result) => {
            if (!result.done) {
              resolve(result.value);
            }
          });
        });
        yield value;
      }
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners = [];
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * const emitter = new DualEventEmitter<number>();
 * 
 * // Callback-based usage
 * const unsubscribe = emitter.on(value => console.log('Received:', value));
 * 
 * // Async iteration usage
 * (async () => {
 *   for await (const value of emitter) {
 *     console.log('Received:', value);
 *     if (value > 10) break;
 *   }
 * })();
 * 
 * // Emit events
 * emitter.emit(1);
 * emitter.emit(2);
 * emitter.emit(15);
 * 
 * // Cleanup
 * unsubscribe();
 * ```
 */
