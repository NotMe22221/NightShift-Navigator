/**
 * Property-based tests for navigation history deletion
 * **Feature: nightshift-navigator, Property 49: History deletion completeness**
 * **Validates: Requirements 10.4**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { NavigationHistoryManager, NavigationSession } from './history';

// Mock IndexedDB for testing
import 'fake-indexeddb/auto';

describe('History Deletion Properties', () => {
  let historyManager: NavigationHistoryManager;

  beforeEach(async () => {
    historyManager = new NavigationHistoryManager({
      dbName: `test-deletion-${Date.now()}-${Math.random()}`,
      storeName: 'test-store'
    });
    await historyManager.initialize();
  });

  afterEach(() => {
    historyManager.close();
  });

  it('Property 49: For any invocation of the delete history function, all stored navigation history should be removed', async () => {
    // **Feature: nightshift-navigator, Property 49: History deletion completeness**
    // **Validates: Requirements 10.4**

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
          { minLength: 1, maxLength: 20 }
        ),
        async (sessions: NavigationSession[]) => {
          // Create fresh manager for this iteration
          const testManager = new NavigationHistoryManager({
            dbName: `test-del-${Date.now()}-${Math.random()}`,
            storeName: 'test-store'
          });
          await testManager.initialize();

          try {
            // Save all sessions
            for (const session of sessions) {
              await testManager.saveSession(session);
            }

            // Verify sessions were saved
            const countBefore = await testManager.getSessionCount();
            expect(countBefore).toBe(sessions.length);

            // Delete all history
            await testManager.deleteAllHistory();

            // Verify all history is removed
            const countAfter = await testManager.getSessionCount();
            expect(countAfter).toBe(0);

            // Verify getAllSessions returns empty array
            const allSessions = await testManager.getAllSessions();
            expect(allSessions.length).toBe(0);

            // Verify individual sessions cannot be retrieved
            for (const session of sessions) {
              const retrieved = await testManager.getSession(session.id);
              expect(retrieved).toBeNull();
            }

            return true;
          } finally {
            testManager.close();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 120000);

  it('Property 49 (variant): Deleting a specific session should only remove that session', async () => {
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
          { minLength: 2, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 9 }),
        async (sessions: NavigationSession[], indexToDelete: number) => {
          // Skip if index is out of bounds
          if (indexToDelete >= sessions.length) {
            return true;
          }

          // Create fresh manager
          const testManager = new NavigationHistoryManager({
            dbName: `test-del-single-${Date.now()}-${Math.random()}`,
            storeName: 'test-store'
          });
          await testManager.initialize();

          try {
            // Save all sessions
            for (const session of sessions) {
              await testManager.saveSession(session);
            }

            const countBefore = await testManager.getSessionCount();
            expect(countBefore).toBe(sessions.length);

            // Delete one specific session
            const sessionToDelete = sessions[indexToDelete];
            await testManager.deleteSession(sessionToDelete.id);

            // Verify count decreased by 1
            const countAfter = await testManager.getSessionCount();
            expect(countAfter).toBe(sessions.length - 1);

            // Verify deleted session cannot be retrieved
            const deleted = await testManager.getSession(sessionToDelete.id);
            expect(deleted).toBeNull();

            // Verify other sessions still exist
            for (let i = 0; i < sessions.length; i++) {
              if (i !== indexToDelete) {
                const retrieved = await testManager.getSession(sessions[i].id);
                expect(retrieved).toBeDefined();
                expect(retrieved?.id).toBe(sessions[i].id);
              }
            }

            return true;
          } finally {
            testManager.close();
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 60000);

  it('Property 49 (variant): Deleting all history multiple times should be idempotent', async () => {
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
          // Create fresh manager
          const testManager = new NavigationHistoryManager({
            dbName: `test-del-idempotent-${Date.now()}-${Math.random()}`,
            storeName: 'test-store'
          });
          await testManager.initialize();

          try {
            // Save sessions
            for (const session of sessions) {
              await testManager.saveSession(session);
            }

            // Delete all history
            await testManager.deleteAllHistory();
            const count1 = await testManager.getSessionCount();
            expect(count1).toBe(0);

            // Delete again (should be idempotent)
            await testManager.deleteAllHistory();
            const count2 = await testManager.getSessionCount();
            expect(count2).toBe(0);

            // Delete a third time
            await testManager.deleteAllHistory();
            const count3 = await testManager.getSessionCount();
            expect(count3).toBe(0);

            return true;
          } finally {
            testManager.close();
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 60000);
});
