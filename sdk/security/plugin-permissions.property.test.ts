/**
 * Property-based tests for plugin permission enforcement
 * **Feature: nightshift-navigator, Property 50: Plugin permission enforcement**
 * **Validates: Requirements 10.5**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PluginPermissionManager, PluginPermission } from './plugin-permissions';

// Generator for plugin permissions
const pluginPermissionArb = fc.constantFrom<PluginPermission>(
  'read_map_data',
  'write_map_data',
  'read_navigation_history',
  'read_sensor_data',
  'read_location',
  'read_camera'
);

describe('Plugin Permission Enforcement Properties', () => {
  let permissionManager: PluginPermissionManager;

  beforeEach(() => {
    permissionManager = new PluginPermissionManager();
  });

  it('Property 50: For any unauthorized data access attempt by a plugin, the access should be blocked', async () => {
    // **Feature: nightshift-navigator, Property 50: Plugin permission enforcement**
    // **Validates: Requirements 10.5**

    await fc.assert(
      fc.property(
        fc.uuid(), // pluginId
        pluginPermissionArb, // permission being requested
        fc.array(pluginPermissionArb, { minLength: 0, maxLength: 5 }), // granted permissions
        (pluginId, requestedPermission, grantedPermissions) => {
          // Reset for each test
          permissionManager.reset();

          // Grant specific permissions to the plugin
          permissionManager.grantPermissions(pluginId, grantedPermissions);

          // Check if the requested permission was granted
          const wasGranted = grantedPermissions.includes(requestedPermission);

          // Attempt to access data with the requested permission
          const result = permissionManager.checkPermission(pluginId, requestedPermission);

          // Verify access is allowed only if permission was granted
          expect(result.allowed).toBe(wasGranted);

          // If not allowed, should have a reason
          if (!result.allowed) {
            expect(result.reason).toBeDefined();
            expect(typeof result.reason).toBe('string');
          }

          // Verify access attempt was logged
          const accessLog = permissionManager.getAccessLog();
          expect(accessLog.length).toBeGreaterThan(0);
          
          const lastAttempt = accessLog[accessLog.length - 1];
          expect(lastAttempt.pluginId).toBe(pluginId);
          expect(lastAttempt.permission).toBe(requestedPermission);
          expect(lastAttempt.allowed).toBe(wasGranted);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 50 (variant): Unauthorized access attempts should be blocked and logged', async () => {
    await fc.assert(
      fc.property(
        fc.uuid(),
        pluginPermissionArb,
        (pluginId, permission) => {
          permissionManager.reset();

          // Don't grant any permissions
          // Attempt access
          const result = permissionManager.checkPermission(pluginId, permission);

          // Should be blocked
          expect(result.allowed).toBe(false);
          expect(result.reason).toBeDefined();

          // Should be logged as unauthorized
          const unauthorizedAttempts = permissionManager.getUnauthorizedAttempts();
          expect(unauthorizedAttempts.length).toBeGreaterThan(0);
          
          const attempt = unauthorizedAttempts.find(
            a => a.pluginId === pluginId && a.permission === permission
          );
          expect(attempt).toBeDefined();
          expect(attempt?.allowed).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 50 (variant): Enforce permission should throw error for unauthorized access', async () => {
    await fc.assert(
      fc.property(
        fc.uuid(),
        pluginPermissionArb,
        (pluginId, permission) => {
          permissionManager.reset();

          // Don't grant permission
          // Attempt to enforce permission should throw
          expect(() => {
            permissionManager.enforcePermission(pluginId, permission);
          }).toThrow();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 50 (variant): Granted permissions should allow access', async () => {
    await fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(pluginPermissionArb, { minLength: 1, maxLength: 6 }),
        (pluginId, permissions) => {
          permissionManager.reset();

          // Grant permissions
          permissionManager.grantPermissions(pluginId, permissions);

          // All granted permissions should allow access
          for (const permission of permissions) {
            const result = permissionManager.checkPermission(pluginId, permission);
            expect(result.allowed).toBe(true);
            expect(result.reason).toBeUndefined();

            // Enforce should not throw
            expect(() => {
              permissionManager.enforcePermission(pluginId, permission);
            }).not.toThrow();
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 50 (variant): Revoking permissions should block access', async () => {
    await fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(pluginPermissionArb, { minLength: 1, maxLength: 6 }),
        (pluginId, permissions) => {
          permissionManager.reset();

          // Grant permissions
          permissionManager.grantPermissions(pluginId, permissions);

          // Verify access is allowed
          for (const permission of permissions) {
            const result = permissionManager.checkPermission(pluginId, permission);
            expect(result.allowed).toBe(true);
          }

          // Revoke all permissions
          permissionManager.revokeAllPermissions(pluginId);

          // Verify access is now blocked
          for (const permission of permissions) {
            const result = permissionManager.checkPermission(pluginId, permission);
            expect(result.allowed).toBe(false);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 50 (variant): Different plugins should have independent permissions', async () => {
    await fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        pluginPermissionArb,
        (pluginId1, pluginId2, permission) => {
          // Skip if same plugin ID
          if (pluginId1 === pluginId2) {
            return true;
          }

          permissionManager.reset();

          // Grant permission to plugin 1 only
          permissionManager.grantPermissions(pluginId1, [permission]);

          // Plugin 1 should have access
          const result1 = permissionManager.checkPermission(pluginId1, permission);
          expect(result1.allowed).toBe(true);

          // Plugin 2 should not have access
          const result2 = permissionManager.checkPermission(pluginId2, permission);
          expect(result2.allowed).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 50 (variant): Access log should track all attempts', async () => {
    await fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(pluginPermissionArb, { minLength: 1, maxLength: 10 }),
        (pluginId, permissions) => {
          permissionManager.reset();
          permissionManager.clearAccessLog();

          // Make multiple access attempts
          for (const permission of permissions) {
            permissionManager.checkPermission(pluginId, permission);
          }

          // Verify all attempts were logged
          const accessLog = permissionManager.getPluginAccessLog(pluginId);
          expect(accessLog.length).toBe(permissions.length);

          // Verify each permission was logged
          for (const permission of permissions) {
            const logged = accessLog.some(
              attempt => attempt.permission === permission && attempt.pluginId === pluginId
            );
            expect(logged).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
