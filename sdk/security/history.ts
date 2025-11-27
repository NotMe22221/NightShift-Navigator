/**
 * Navigation history storage with encryption
 * Stores navigation sessions securely in IndexedDB
 */

import { EncryptionService, EncryptedData } from './encryption';

/**
 * Navigation session data
 */
export interface NavigationSession {
  id: string;
  startTime: number;
  endTime: number;
  startPosition: {
    latitude: number;
    longitude: number;
  };
  endPosition: {
    latitude: number;
    longitude: number;
  };
  route: any; // Route object
  averageLightLevel: number;
  hazardsEncountered: number;
}

/**
 * Navigation history container
 */
export interface NavigationHistory {
  sessions: NavigationSession[];
}

/**
 * Storage configuration
 */
export interface HistoryStorageConfig {
  dbName: string;
  storeName: string;
  encryptionPassword?: string;
}

/**
 * Navigation history manager with encryption
 */
export class NavigationHistoryManager {
  private config: HistoryStorageConfig;
  private encryption: EncryptionService;
  private db: IDBDatabase | null = null;
  private encryptionPassword: string;

  constructor(config?: Partial<HistoryStorageConfig>) {
    this.config = {
      dbName: config?.dbName || 'nightshift-navigator',
      storeName: config?.storeName || 'navigation-history',
      encryptionPassword: config?.encryptionPassword
    };

    this.encryption = new EncryptionService();
    
    // Generate or use provided encryption password
    this.encryptionPassword = this.config.encryptionPassword || this.encryption.generatePassword();
  }

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, 1);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          db.createObjectStore(this.config.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Save a navigation session (encrypted)
   */
  async saveSession(session: NavigationSession): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Encrypt the session data
    const encryptedData = await this.encryption.encrypt(session, this.encryptionPassword);

    // Store encrypted data in IndexedDB
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);

      const request = store.put({
        id: session.id,
        encrypted: encryptedData,
        timestamp: session.startTime
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save session'));
    });
  }

  /**
   * Get a navigation session by ID (decrypted)
   */
  async getSession(id: string): Promise<NavigationSession | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.get(id);

      request.onsuccess = async () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        try {
          // Decrypt the session data
          const decrypted = await this.encryption.decrypt(
            result.encrypted as EncryptedData,
            this.encryptionPassword
          );
          resolve(decrypted);
        } catch (error) {
          reject(new Error('Failed to decrypt session'));
        }
      };

      request.onerror = () => reject(new Error('Failed to retrieve session'));
    });
  }

  /**
   * Get all navigation sessions (decrypted)
   */
  async getAllSessions(): Promise<NavigationSession[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.getAll();

      request.onsuccess = async () => {
        const results = request.result;
        
        try {
          // Decrypt all sessions
          const sessions = await Promise.all(
            results.map(async (result: any) => {
              return await this.encryption.decrypt(
                result.encrypted as EncryptedData,
                this.encryptionPassword
              );
            })
          );
          resolve(sessions);
        } catch (error) {
          reject(new Error('Failed to decrypt sessions'));
        }
      };

      request.onerror = () => reject(new Error('Failed to retrieve sessions'));
    });
  }

  /**
   * Delete a specific navigation session
   */
  async deleteSession(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete session'));
    });
  }

  /**
   * Delete all navigation history
   */
  async deleteAllHistory(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear history'));
    });
  }

  /**
   * Verify all stored data is encrypted
   */
  async verifyEncryption(): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result;
        
        // Check that all entries have encrypted data
        const allEncrypted = results.every((result: any) => {
          return result.encrypted && 
                 result.encrypted.ciphertext && 
                 result.encrypted.iv && 
                 result.encrypted.salt;
        });

        resolve(allEncrypted);
      };

      request.onerror = () => reject(new Error('Failed to verify encryption'));
    });
  }

  /**
   * Get the number of stored sessions
   */
  async getSessionCount(): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to count sessions'));
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Check if encryption is using AES-256
   */
  isUsingAES256(): boolean {
    return this.encryption.isAES256();
  }
}

// Singleton instance
let historyManagerInstance: NavigationHistoryManager | null = null;

/**
 * Get the global NavigationHistoryManager instance
 */
export function getNavigationHistoryManager(): NavigationHistoryManager {
  if (!historyManagerInstance) {
    historyManagerInstance = new NavigationHistoryManager();
  }
  return historyManagerInstance;
}
