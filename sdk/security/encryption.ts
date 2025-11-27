/**
 * Encryption utilities for NightShift Navigator
 * Provides AES-256 encryption for sensitive data
 */

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
}

/**
 * Encrypted data container
 */
export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt for key derivation
}

/**
 * Encryption service using Web Crypto API
 */
export class EncryptionService {
  private config: EncryptionConfig;
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly IV_LENGTH = 12; // 96 bits for GCM
  private readonly SALT_LENGTH = 16; // 128 bits
  private readonly ITERATIONS = 10000; // PBKDF2 iterations (reduced for performance)

  constructor(config?: Partial<EncryptionConfig>) {
    this.config = {
      algorithm: config?.algorithm || this.ALGORITHM,
      keyLength: config?.keyLength || this.KEY_LENGTH
    };
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param data Data to encrypt (will be JSON stringified)
   * @param password Password for encryption
   * @returns Encrypted data with IV and salt
   */
  async encrypt(data: any, password: string): Promise<EncryptedData> {
    // Generate random salt for key derivation
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));

    // Derive encryption key from password
    const key = await this.deriveKey(password, salt);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    // Convert data to JSON and then to bytes
    const dataString = JSON.stringify(data);
    const dataBytes = new TextEncoder().encode(dataString);

    // Encrypt the data
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv
      },
      key,
      dataBytes
    );

    // Convert to base64 for storage
    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt)
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param encryptedData Encrypted data with IV and salt
   * @param password Password for decryption
   * @returns Decrypted data
   */
  async decrypt(encryptedData: EncryptedData, password: string): Promise<any> {
    // Convert from base64
    const ciphertext = this.base64ToArrayBuffer(encryptedData.ciphertext);
    const iv = this.base64ToArrayBuffer(encryptedData.iv);
    const salt = this.base64ToArrayBuffer(encryptedData.salt);

    // Derive decryption key from password
    const key = await this.deriveKey(password, new Uint8Array(salt));

    // Decrypt the data
    const decryptedBytes = await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: new Uint8Array(iv)
      },
      key,
      ciphertext
    );

    // Convert bytes back to string and parse JSON
    const decryptedString = new TextDecoder().decode(decryptedBytes);
    return JSON.parse(decryptedString);
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    // Import password as key material
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      passwordKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Generate a random encryption password
   * Useful for automatic encryption without user password
   */
  generatePassword(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return this.arrayBufferToBase64(array.buffer);
  }

  /**
   * Verify encryption algorithm is AES-256
   */
  isAES256(): boolean {
    return this.config.algorithm === 'AES-GCM' && this.config.keyLength === 256;
  }
}

// Singleton instance
let encryptionServiceInstance: EncryptionService | null = null;

/**
 * Get the global EncryptionService instance
 */
export function getEncryptionService(): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionService();
  }
  return encryptionServiceInstance;
}
