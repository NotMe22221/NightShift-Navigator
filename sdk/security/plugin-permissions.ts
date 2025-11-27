/**
 * Plugin permission enforcement
 * Defines and enforces permission boundaries for plugins
 */

/**
 * Permission types that plugins can request
 */
export type PluginPermission = 
  | 'read_map_data'
  | 'write_map_data'
  | 'read_navigation_history'
  | 'read_sensor_data'
  | 'read_location'
  | 'read_camera';

/**
 * Plugin permission configuration
 */
export interface PluginPermissionConfig {
  pluginId: string;
  grantedPermissions: Set<PluginPermission>;
}

/**
 * Permission request result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Data access attempt
 */
export interface DataAccessAttempt {
  pluginId: string;
  permission: PluginPermission;
  timestamp: number;
  allowed: boolean;
  reason?: string;
}

/**
 * Plugin permission manager
 * Enforces permission boundaries for plugins
 */
export class PluginPermissionManager {
  private pluginPermissions: Map<string, Set<PluginPermission>> = new Map();
  private accessLog: DataAccessAttempt[] = [];
  private maxLogSize = 1000;

  /**
   * Grant permissions to a plugin
   */
  grantPermissions(pluginId: string, permissions: PluginPermission[]): void {
    if (!this.pluginPermissions.has(pluginId)) {
      this.pluginPermissions.set(pluginId, new Set());
    }
    
    const pluginPerms = this.pluginPermissions.get(pluginId)!;
    permissions.forEach(perm => pluginPerms.add(perm));
  }

  /**
   * Revoke permissions from a plugin
   */
  revokePermissions(pluginId: string, permissions: PluginPermission[]): void {
    const pluginPerms = this.pluginPermissions.get(pluginId);
    if (!pluginPerms) {
      return;
    }

    permissions.forEach(perm => pluginPerms.delete(perm));
  }

  /**
   * Revoke all permissions from a plugin
   */
  revokeAllPermissions(pluginId: string): void {
    this.pluginPermissions.delete(pluginId);
  }

  /**
   * Check if a plugin has a specific permission
   */
  hasPermission(pluginId: string, permission: PluginPermission): boolean {
    const pluginPerms = this.pluginPermissions.get(pluginId);
    return pluginPerms?.has(permission) ?? false;
  }

  /**
   * Check and enforce permission for data access
   * Logs all access attempts
   */
  checkPermission(pluginId: string, permission: PluginPermission): PermissionCheckResult {
    const hasPermission = this.hasPermission(pluginId, permission);
    
    const attempt: DataAccessAttempt = {
      pluginId,
      permission,
      timestamp: Date.now(),
      allowed: hasPermission,
      reason: hasPermission ? undefined : `Plugin ${pluginId} does not have ${permission} permission`
    };

    this.logAccess(attempt);

    return {
      allowed: hasPermission,
      reason: attempt.reason
    };
  }

  /**
   * Enforce permission check - throws error if permission denied
   */
  enforcePermission(pluginId: string, permission: PluginPermission): void {
    const result = this.checkPermission(pluginId, permission);
    
    if (!result.allowed) {
      throw new Error(`Permission denied: ${result.reason}`);
    }
  }

  /**
   * Get all permissions for a plugin
   */
  getPluginPermissions(pluginId: string): PluginPermission[] {
    const perms = this.pluginPermissions.get(pluginId);
    return perms ? Array.from(perms) : [];
  }

  /**
   * Get all registered plugins
   */
  getRegisteredPlugins(): string[] {
    return Array.from(this.pluginPermissions.keys());
  }

  /**
   * Check if plugin is registered
   */
  isPluginRegistered(pluginId: string): boolean {
    return this.pluginPermissions.has(pluginId);
  }

  /**
   * Get access log
   */
  getAccessLog(): DataAccessAttempt[] {
    return [...this.accessLog];
  }

  /**
   * Get unauthorized access attempts
   */
  getUnauthorizedAttempts(): DataAccessAttempt[] {
    return this.accessLog.filter(attempt => !attempt.allowed);
  }

  /**
   * Get access attempts for a specific plugin
   */
  getPluginAccessLog(pluginId: string): DataAccessAttempt[] {
    return this.accessLog.filter(attempt => attempt.pluginId === pluginId);
  }

  /**
   * Clear access log
   */
  clearAccessLog(): void {
    this.accessLog = [];
  }

  /**
   * Log an access attempt
   */
  private logAccess(attempt: DataAccessAttempt): void {
    this.accessLog.push(attempt);
    
    // Keep log size manageable
    if (this.accessLog.length > this.maxLogSize) {
      this.accessLog.shift();
    }
  }

  /**
   * Set maximum log size
   */
  setMaxLogSize(size: number): void {
    this.maxLogSize = size;
    
    // Trim log if needed
    while (this.accessLog.length > this.maxLogSize) {
      this.accessLog.shift();
    }
  }

  /**
   * Reset all permissions and logs
   */
  reset(): void {
    this.pluginPermissions.clear();
    this.accessLog = [];
  }
}

// Singleton instance
let pluginPermissionManagerInstance: PluginPermissionManager | null = null;

/**
 * Get the global PluginPermissionManager instance
 */
export function getPluginPermissionManager(): PluginPermissionManager {
  if (!pluginPermissionManagerInstance) {
    pluginPermissionManagerInstance = new PluginPermissionManager();
  }
  return pluginPermissionManagerInstance;
}
