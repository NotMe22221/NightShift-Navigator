/**
 * Property-Based Tests for Plugin Authentication
 * 
 * **Feature: nightshift-navigator, Property 34: Plugin authentication**
 * **Validates: Requirements 7.4**
 * 
 * Property: For any authentication attempt with valid credentials, the Plugin API 
 * should grant access; for invalid credentials, access should be denied.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PluginAPI, PluginAuth } from './index';
import { GraphBuilder } from '../pathfinding';

describe('Property 34: Plugin authentication', () => {
  let pluginAPI: PluginAPI;
  let graphBuilder: GraphBuilder;

  beforeEach(() => {
    graphBuilder = new GraphBuilder();
    pluginAPI = new PluginAPI(
      {
        authenticationRequired: true,
        maxDataSizeMB: 10,
        conflictResolution: 'merge',
      },
      graphBuilder
    );
  });

  // Generator for valid API keys (at least 32 characters)
  const validApiKey = fc.string({ minLength: 32, maxLength: 64 });

  // Generator for valid App IDs (alphanumeric with dashes and underscores)
  const validAppId = fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/);

  // Generator for valid authentication credentials
  const validAuth = fc.record({
    apiKey: validApiKey,
    appId: validAppId,
  });

  // Generator for invalid API keys (less than 32 characters)
  const invalidApiKey = fc.string({ minLength: 0, maxLength: 31 });

  // Generator for invalid App IDs (contains invalid characters)
  const invalidAppId = fc.oneof(
    fc.string().filter(s => !/^[a-zA-Z0-9_-]+$/.test(s) && s.length > 0),
    fc.constant('') // Empty string
  );

  it('should grant access for valid credentials', async () => {
    await fc.assert(
      fc.asyncProperty(validAuth, async (auth) => {
        const result = await pluginAPI.authenticate(auth);
        
        // Valid credentials should be accepted
        expect(result).toBe(true);
        
        // Should be marked as authenticated
        expect(pluginAPI.isAuthenticated(auth.appId)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should deny access for invalid API keys (too short)', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidApiKey,
        validAppId,
        async (apiKey, appId) => {
          const auth: PluginAuth = { apiKey, appId };
          const result = await pluginAPI.authenticate(auth);
          
          // Invalid API key should be rejected
          expect(result).toBe(false);
          
          // Should not be marked as authenticated
          expect(pluginAPI.isAuthenticated(appId)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should deny access for invalid App IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        validApiKey,
        invalidAppId,
        async (apiKey, appId) => {
          const auth: PluginAuth = { apiKey, appId };
          const result = await pluginAPI.authenticate(auth);
          
          // Invalid App ID should be rejected
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should deny access for missing credentials', async () => {
    const invalidAuths = [
      { apiKey: '', appId: 'valid-app-id' },
      { apiKey: 'a'.repeat(32), appId: '' },
      { apiKey: '', appId: '' },
    ];

    for (const auth of invalidAuths) {
      const result = await pluginAPI.authenticate(auth as PluginAuth);
      expect(result).toBe(false);
    }
  });

  it('should maintain authentication state across multiple checks', async () => {
    await fc.assert(
      fc.asyncProperty(validAuth, async (auth) => {
        // Authenticate
        const authResult = await pluginAPI.authenticate(auth);
        expect(authResult).toBe(true);
        
        // Check authentication multiple times
        for (let i = 0; i < 5; i++) {
          expect(pluginAPI.isAuthenticated(auth.appId)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle multiple app authentications independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validAuth, { minLength: 2, maxLength: 5 }),
        async (auths) => {
          // Authenticate all apps
          for (const auth of auths) {
            const result = await pluginAPI.authenticate(auth);
            expect(result).toBe(true);
          }
          
          // Verify all are authenticated
          for (const auth of auths) {
            expect(pluginAPI.isAuthenticated(auth.appId)).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not require authentication when authenticationRequired is false', async () => {
    const noAuthPluginAPI = new PluginAPI(
      {
        authenticationRequired: false,
        maxDataSizeMB: 10,
        conflictResolution: 'merge',
      },
      graphBuilder
    );

    await fc.assert(
      fc.asyncProperty(
        fc.string(), // Any string for appId
        async (appId) => {
          // Should be authenticated without calling authenticate()
          expect(noAuthPluginAPI.isAuthenticated(appId)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept any credentials when authenticationRequired is false', async () => {
    const noAuthPluginAPI = new PluginAPI(
      {
        authenticationRequired: false,
        maxDataSizeMB: 10,
        conflictResolution: 'merge',
      },
      graphBuilder
    );

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          apiKey: fc.string(),
          appId: fc.string(),
        }),
        async (auth) => {
          const result = await noAuthPluginAPI.authenticate(auth as PluginAuth);
          
          // Should always return true when authentication not required
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should consistently reject the same invalid credentials', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.record({ apiKey: invalidApiKey, appId: validAppId }),
          fc.record({ apiKey: validApiKey, appId: invalidAppId })
        ),
        async (auth) => {
          // Try authenticating multiple times with same invalid credentials
          for (let i = 0; i < 3; i++) {
            const result = await pluginAPI.authenticate(auth as PluginAuth);
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case API key lengths correctly', async () => {
    // Exactly 31 characters (invalid)
    const auth31 = {
      apiKey: 'a'.repeat(31),
      appId: 'valid-app-id',
    };
    expect(await pluginAPI.authenticate(auth31)).toBe(false);

    // Exactly 32 characters (valid)
    const auth32 = {
      apiKey: 'a'.repeat(32),
      appId: 'valid-app-id',
    };
    expect(await pluginAPI.authenticate(auth32)).toBe(true);

    // Exactly 33 characters (valid)
    const auth33 = {
      apiKey: 'a'.repeat(33),
      appId: 'valid-app-id',
    };
    expect(await pluginAPI.authenticate(auth33)).toBe(true);
  });
});
