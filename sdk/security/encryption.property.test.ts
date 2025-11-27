/**
 * Property-based tests for navigation history encryption
 * **Feature: nightshift-navigator, Property 48: Navigation history encryption**
 * **Validates: Requirements 10.3**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { NavigationHistoryManager, NavigationSession } from './history';
import { EncryptionService } from './encryption';

// Mock IndexedDB for testing
import 'fake-indexeddb/auto';

describe('Navigation History Encryption Properties', () => {
  let historyManager: NavigationHistoryManager;

  beforeEach(async () => {
    // Create a new history manager for each test with unique DB name
    historyManager = new NavigationHistoryManager({
      dbName: `test-db-${Date.now()}-${Math.random()}`,
      storeName: 'test-store'
    });
    await historyManager.initialize();
    // Clear any existing data
    await historyManager.deleteAllHistory();
  });

  afterEach(() => {
    historyManager.close();
  });

  it('Property 48: For any navigation history data stored to disk, the data should be encrypted using AES-256', async () => {
    // **Feature: nightshift-navigator, Property 48: Navigation history encryption**
    // **Validates: Requirements 10.3**

    await fc.assert(
      fc.asyncProperty(
        // Generate random navigation session
        fc.record({
          id: fc.uuid(),
          startTime: fc.integer({ min: 1000000000000, max: 2000000000000 }),
          endTime: fc.integer({ min: 1000000000000, max: 2000000000000 }),
          startPosition: fc.record({
            latitude: fc.double({ min: -90, max: 90 }),
            longitude: fc.double({ min: -180, max: 180 })
          }),
          endPosition: fc.record({
            latitude: fc.double({ min: -90, max: 90 }),
            longitude: fc.double({ min: -180, max: 180 })
          }),
          route: fc.object(),
          averageLightLevel: fc.double({ min: 0, max: 1 }),
          hazardsEncountered: fc.integer({ min: 0, max: 100 })
        }),
        async (session: NavigationSession) => {
          // Verify encryption is using AES-256
          expect(historyManager.isUsingAES256()).toBe(true);

          // Save the session
          await historyManager.saveSession(session);

          // Verify the data is encrypted in storage
          const isEncrypted = await historyManager.verifyEncryption();
          expect(isEncrypted).toBe(true);

          // Retrieve and verify we can decrypt it
          const retrieved = await historyManager.getSession(session.id);
          expect(retrieved).toBeDefined();
          expect(retrieved?.id).toBe(session.id);
          expect(retrieved?.startTime).toBe(session.startTime);

          return true;
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 120000);

  it('Property 48 (variant): Encrypted data should be decryptable with correct password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          startTime: fc.integer({ min: 1000000000000, max: 2000000000000 }),
          endTime: fc.integer({ min: 1000000000000, max: 2000000000000 }),
          startPosition: fc.record({
            latitude: fc.double({ min: -90, max: 90 }),
            longitude: fc.double({ min: -180, max: 180 })
          }),
          endPosition: fc.record({
            latitude: fc.double({ min: -90, max: 90 }),
            longitude: fc.double({ min: -180, max: 180 })
          }),
          route: fc.object(),
          averageLightLevel: fc.double({ min: 0, max: 1 }),
          hazardsEncountered: fc.integer({ min: 0, max: 100 })
        }),
        async (session: NavigationSession) => {
          // Save session
          await historyManager.saveSession(session);

          // Retrieve and verify all fields match
          const retrieved = await historyManager.getSession(session.id);
          
          expect(retrieved).toBeDefined();
          expect(retrieved?.id).toBe(session.id);
          expect(retrieved?.startTime).toBe(session.startTime);
          expect(retrieved?.endTime).toBe(session.endTime);
          expect(retrieved?.startPosition.latitude).toBeCloseTo(session.startPosition.latitude, 10);
          expect(retrieved?.startPosition.longitude).toBeCloseTo(session.startPosition.longitude, 10);
          expect(retrieved?.endPosition.latitude).toBeCloseTo(session.endPosition.latitude, 10);
          expect(retrieved?.endPosition.longitude).toBeCloseTo(session.endPosition.longitude, 10);
          // Handle NaN case (JSON doesn't preserve NaN, it becomes null)
          if (isNaN(session.averageLightLevel)) {
            expect(retrieved?.averageLightLevel).toBeNull();
          } else {
            expect(retrieved?.averageLightLevel).toBeCloseTo(session.averageLightLevel, 10);
          }
          expect(retrieved?.hazardsEncountered).toBe(session.hazardsEncountered);

          return true;
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 60000);

  it('Property 48 (variant): Multiple sessions should all be encrypted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            startTime: fc.integer({ min: 1000000000000, max: 2000000000000 }),
            endTime: fc.integer({ min: 1000000000000, max: 2000000000000 }),
            startPosition: fc.record({
              latitude: fc.double({ min: -90, max: 90 }),
              longitude: fc.double({ min: -180, max: 180 })
            }),
            endPosition: fc.record({
              latitude: fc.double({ min: -90, max: 90 }),
              longitude: fc.double({ min: -180, max: 180 })
            }),
            route: fc.object(),
            averageLightLevel: fc.double({ min: 0, max: 1 }),
            hazardsEncountered: fc.integer({ min: 0, max: 100 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (sessions: NavigationSession[]) => {
          // Create a fresh history manager for this iteration
          const testManager = new NavigationHistoryManager({
            dbName: `test-multi-${Date.now()}-${Math.random()}`,
            storeName: 'test-store'
          });
          await testManager.initialize();

          try {
            // Save all sessions
            for (const session of sessions) {
              await testManager.saveSession(session);
            }

            // Verify all data is encrypted
            const isEncrypted = await testManager.verifyEncryption();
            expect(isEncrypted).toBe(true);

            // Verify we can retrieve all sessions
            const allSessions = await testManager.getAllSessions();
            expect(allSessions.length).toBe(sessions.length);

            return true;
          } finally {
            testManager.close();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  }, 30000);
});

describe('Encryption Service Properties', () => {
  let encryption: EncryptionService;

  beforeEach(() => {
    encryption = new EncryptionService();
  });

  it('should use AES-256 encryption', () => {
    expect(encryption.isAES256()).toBe(true);
  });

  it('should encrypt and decrypt data correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.double(),
          fc.boolean(),
          fc.array(fc.string()),
          fc.record({
            name: fc.string(),
            value: fc.integer()
          })
        ),
        fc.string({ minLength: 8, maxLength: 32 }),
        async (data, password) => {
          // Encrypt
          const encrypted = await encryption.encrypt(data, password);

          // Verify encrypted data structure
          expect(encrypted.ciphertext).toBeDefined();
          expect(encrypted.iv).toBeDefined();
          expect(encrypted.salt).toBeDefined();
          expect(typeof encrypted.ciphertext).toBe('string');
          expect(typeof encrypted.iv).toBe('string');
          expect(typeof encrypted.salt).toBe('string');

          // Decrypt
          const decrypted = await encryption.decrypt(encrypted, password);

          // Verify data matches (with JSON round-trip)
          expect(JSON.stringify(decrypted)).toBe(JSON.stringify(data));

          return true;
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 15000);

  it('should produce different ciphertexts for same data (due to random IV)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string({ minLength: 8 }),
        async (data, password) => {
          const encrypted1 = await encryption.encrypt(data, password);
          const encrypted2 = await encryption.encrypt(data, password);

          // IVs should be different
          expect(encrypted1.iv).not.toBe(encrypted2.iv);
          
          // Ciphertexts should be different
          expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);

          // But both should decrypt to same data
          const decrypted1 = await encryption.decrypt(encrypted1, password);
          const decrypted2 = await encryption.decrypt(encrypted2, password);
          expect(decrypted1).toBe(decrypted2);
          expect(decrypted1).toBe(data);

          return true;
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 60000);

  it('should fail to decrypt with wrong password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string({ minLength: 8 }),
        fc.string({ minLength: 8 }),
        async (data, password1, password2) => {
          // Skip if passwords are the same
          if (password1 === password2) {
            return true;
          }

          const encrypted = await encryption.encrypt(data, password1);

          // Attempt to decrypt with wrong password should fail
          try {
            await encryption.decrypt(encrypted, password2);
            // If it doesn't throw, that's a problem
            return false;
          } catch (error) {
            // Expected to fail
            return true;
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 60000);
});
