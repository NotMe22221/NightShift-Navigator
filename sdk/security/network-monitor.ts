/**
 * Network monitoring for privacy verification
 * Ensures no image data is transmitted over the network
 */

export interface NetworkRequest {
  url: string;
  method: string;
  timestamp: number;
  hasImageData: boolean;
  bodySize?: number;
}

export interface NetworkMonitorConfig {
  enabled: boolean;
  logRequests: boolean;
}

/**
 * Monitors network traffic to verify no image data is transmitted
 */
export class NetworkMonitor {
  private config: NetworkMonitorConfig;
  private requests: NetworkRequest[] = [];
  private originalFetch: typeof fetch;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send;
  private monitoring = false;

  constructor(config: NetworkMonitorConfig = { enabled: true, logRequests: true }) {
    this.config = config;
    this.originalFetch = globalThis.fetch;
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
  }

  /**
   * Start monitoring network traffic
   */
  start(): void {
    if (this.monitoring) {
      return;
    }

    this.monitoring = true;

    // Intercept fetch API
    const self = this;
    globalThis.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';
      const hasImageData = self.detectImageDataInRequest(init?.body);

      if (self.config.logRequests) {
        self.requests.push({
          url,
          method,
          timestamp: Date.now(),
          hasImageData,
          bodySize: self.getBodySize(init?.body)
        });
      }

      return self.originalFetch.call(globalThis, input, init);
    };

    // Intercept XMLHttpRequest
    const xhrRequests = new WeakMap<XMLHttpRequest, { url: string; method: string }>();

    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]): void {
      const urlString = typeof url === 'string' ? url : url.href;
      xhrRequests.set(this, { url: urlString, method });
      return self.originalXHROpen.call(this, method, url as string, ...args);
    };

    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null): void {
      const requestInfo = xhrRequests.get(this);
      if (requestInfo && self.config.logRequests) {
        const hasImageData = self.detectImageDataInRequest(body);
        self.requests.push({
          url: requestInfo.url,
          method: requestInfo.method,
          timestamp: Date.now(),
          hasImageData,
          bodySize: self.getBodySize(body)
        });
      }
      return self.originalXHRSend.call(this, body);
    };
  }

  /**
   * Stop monitoring network traffic
   */
  stop(): void {
    if (!this.monitoring) {
      return;
    }

    // Restore original implementations
    globalThis.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXHROpen;
    XMLHttpRequest.prototype.send = this.originalXHRSend;

    this.monitoring = false;
  }

  /**
   * Check if any requests contained image data
   */
  hasImageDataTransmissions(): boolean {
    return this.requests.some(req => req.hasImageData);
  }

  /**
   * Get all network requests
   */
  getRequests(): NetworkRequest[] {
    return [...this.requests];
  }

  /**
   * Get requests that contained image data
   */
  getImageDataRequests(): NetworkRequest[] {
    return this.requests.filter(req => req.hasImageData);
  }

  /**
   * Clear request log
   */
  clearRequests(): void {
    this.requests = [];
  }

  /**
   * Detect if request body contains image data
   */
  private detectImageDataInRequest(body: any): boolean {
    if (!body) {
      return false;
    }

    // Check for ImageData
    if (body instanceof ImageData) {
      return true;
    }

    // Check for Blob with image MIME type
    if (body instanceof Blob) {
      return body.type.startsWith('image/');
    }

    // Check for ArrayBuffer or TypedArray (could be image data)
    if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
      // If it's a large binary payload, it might be image data
      const size = body instanceof ArrayBuffer ? body.byteLength : body.byteLength;
      // Typical image sizes are > 10KB
      return size > 10240;
    }

    // Check for FormData containing files
    if (body instanceof FormData) {
      // We can't easily inspect FormData, so we assume it might contain images
      // In a real implementation, we'd need to iterate through entries
      return true;
    }

    // Check for base64 encoded images in strings
    if (typeof body === 'string') {
      // Look for data URLs or base64 image patterns
      return /data:image\//.test(body) || 
             (/^[A-Za-z0-9+/=]{1000,}$/.test(body) && body.length > 10000);
    }

    // Check for JSON containing image data
    if (typeof body === 'object') {
      const jsonString = JSON.stringify(body);
      return /data:image\//.test(jsonString) || 
             /"imageData"/.test(jsonString) ||
             /"frame"/.test(jsonString);
    }

    return false;
  }

  /**
   * Get size of request body
   */
  private getBodySize(body: any): number | undefined {
    if (!body) {
      return 0;
    }

    if (body instanceof ArrayBuffer) {
      return body.byteLength;
    }

    if (ArrayBuffer.isView(body)) {
      return body.byteLength;
    }

    if (body instanceof Blob) {
      return body.size;
    }

    if (typeof body === 'string') {
      return body.length;
    }

    if (body instanceof ImageData) {
      return body.data.length;
    }

    return undefined;
  }

  /**
   * Get monitoring status
   */
  isMonitoring(): boolean {
    return this.monitoring;
  }
}

// Singleton instance
let networkMonitorInstance: NetworkMonitor | null = null;

/**
 * Get the global NetworkMonitor instance
 */
export function getNetworkMonitor(): NetworkMonitor {
  if (!networkMonitorInstance) {
    networkMonitorInstance = new NetworkMonitor();
  }
  return networkMonitorInstance;
}
