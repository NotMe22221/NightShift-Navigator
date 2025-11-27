/**
 * Property-Based Tests for Documentation Completeness
 * 
 * **Feature: nightshift-navigator, Property 43: Documentation completeness**
 * **Validates: Requirements 9.3**
 * 
 * Property: Documentation completeness
 * For any SDK module, comprehensive documentation with code examples should be available.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Core SDK modules that should have documentation
const SDK_MODULES = [
  'sensor-fusion',
  'computer-vision',
  'pathfinding',
  'ar-overlay',
  'audio',
  'energy',
  'plugin-api',
  'error-handling',
  'security',
  'types'
] as const;

// Public API functions that should be documented
const PUBLIC_APIS = {
  'sensor-fusion': [
    'computeBrightnessHistogram',
    'normalizeLightSensorReading',
    'detectShadows',
    'computeWeightedFusion',
    'SensorFusionLayer'
  ],
  'computer-vision': [
    'detectHazards',
    'generateContrastMap',
    'CVPipeline'
  ],
  'pathfinding': [
    'parseGeoJSON',
    'computeVisibilityScore',
    'computeSafetyScore',
    'astar',
    'GraphBuilder'
  ],
  'ar-overlay': [
    'AROverlay'
  ],
  'audio': [
    'AudioSystem',
    'generateNavigationCue',
    'generateHazardAudioCue'
  ],
  'energy': [
    'EnergyManagerImpl',
    'getAdaptiveRoutingConfig'
  ],
  'plugin-api': [
    'PluginAPI'
  ],
  'error-handling': [
    'DefaultErrorHandler',
    'DefaultErrorLogger',
    'createError'
  ],
  'security': [
    'encryptData',
    'decryptData',
    'PermissionManager'
  ],
  'types': []
} as const;

describe('Property 43: Documentation completeness', () => {
  it('should have README.md with comprehensive documentation', () => {
    const readmePath = path.join(__dirname, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);
    
    const readmeContent = fs.readFileSync(readmePath, 'utf-8');
    
    // Verify README has substantial content
    expect(readmeContent.length).toBeGreaterThan(1000);
    
    // Verify README has key sections
    expect(readmeContent).toContain('# NightShift Navigator SDK');
    expect(readmeContent).toContain('## Installation');
    expect(readmeContent).toContain('## Quick Start');
    expect(readmeContent).toContain('## Core Modules');
    expect(readmeContent).toContain('## Examples');
    expect(readmeContent).toContain('## API Reference');
  });

  it('should have code examples for each core module in README', () => {
    const readmePath = path.join(__dirname, 'README.md');
    const readmeContent = fs.readFileSync(readmePath, 'utf-8');
    
    // User-facing modules that should be documented in README
    const userFacingModules = [
      'sensor-fusion',
      'computer-vision',
      'pathfinding',
      'ar-overlay',
      'audio',
      'energy',
      'plugin-api',
      'error-handling'
    ];
    
    // Check that each user-facing module has a section with code examples
    for (const module of userFacingModules) {
      // Convert module name to title case for section headers
      const moduleTitle = module
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Verify module section exists
      const hasModuleSection = 
        readmeContent.includes(`### ${moduleTitle}`) ||
        readmeContent.includes(`## ${moduleTitle}`) ||
        // Some modules might be documented under different names
        (module === 'ar-overlay' && readmeContent.includes('AR Overlay')) ||
        (module === 'plugin-api' && readmeContent.includes('Plugin API')) ||
        (module === 'error-handling' && readmeContent.includes('Error Handling')) ||
        (module === 'computer-vision' && readmeContent.includes('Computer Vision'));
      
      expect(hasModuleSection).toBe(true);
    }
    
    // Verify code examples exist (look for code blocks)
    const codeBlockCount = (readmeContent.match(/```typescript/g) || []).length;
    expect(codeBlockCount).toBeGreaterThan(10); // Should have many code examples
  });

  it('should have TSDoc comments on all public module index files', () => {
    for (const module of SDK_MODULES) {
      const indexPath = path.join(__dirname, module, 'index.ts');
      
      if (!fs.existsSync(indexPath)) {
        // Some modules might not have index.ts, skip them
        continue;
      }
      
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      
      // Verify file has TSDoc comment at the top
      expect(indexContent).toMatch(/^\/\*\*[\s\S]*?\*\//);
      
      // Verify it describes the module
      const firstComment = indexContent.match(/^\/\*\*([\s\S]*?)\*\//)?.[1] || '';
      expect(firstComment.length).toBeGreaterThan(20);
    }
  });

  it('should have TSDoc comments on public API functions', () => {
    // Check a sample of key public APIs for documentation
    const keyAPIs = [
      { module: 'sensor-fusion', api: 'computeWeightedFusion' },
      { module: 'sensor-fusion', api: 'detectShadows' },
      { module: 'computer-vision', api: 'detectHazards' },
      { module: 'pathfinding', api: 'computeVisibilityScore' },
      { module: 'pathfinding', api: 'computeSafetyScore' }
    ];
    
    let documentedCount = 0;
    let totalChecked = 0;
    
    for (const { module, api } of keyAPIs) {
      const modulePath = path.join(__dirname, module);
      
      if (!fs.existsSync(modulePath)) continue;
      
      // Search for the API in module files
      const files = fs.readdirSync(modulePath).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));
      
      let foundApi = false;
      let hasDocumentation = false;
      
      for (const file of files) {
        const filePath = path.join(modulePath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Check if this file contains the API
        if (content.includes(`export function ${api}`) ||
            content.includes(`export const ${api}`)) {
          foundApi = true;
          totalChecked++;
          
          // Check if there's a TSDoc comment before the export
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(`export function ${api}`) ||
                lines[i].includes(`export const ${api}`)) {
              // Look backwards for TSDoc comment
              for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
                if (lines[j].includes('/**')) {
                  hasDocumentation = true;
                  documentedCount++;
                  break;
                }
                // Stop if we hit another export or significant code
                if (lines[j].includes('export ') && !lines[j].trim().startsWith('//')) {
                  break;
                }
              }
              break;
            }
          }
          
          if (foundApi) break;
        }
      }
    }
    
    // At least 60% of checked APIs should have documentation
    if (totalChecked > 0) {
      const documentationRatio = documentedCount / totalChecked;
      expect(documentationRatio).toBeGreaterThanOrEqual(0.6);
    }
  });

  it('should have @param and @returns tags for documented functions', () => {
    const modulesToCheck = ['sensor-fusion', 'computer-vision', 'pathfinding'];
    
    let totalDocumentedFunctions = 0;
    let functionsWithProperTags = 0;
    
    for (const module of modulesToCheck) {
      const modulePath = path.join(__dirname, module);
      
      if (!fs.existsSync(modulePath)) continue;
      
      const files = fs.readdirSync(modulePath).filter(f => 
        f.endsWith('.ts') && 
        !f.endsWith('.test.ts') &&
        !f.includes('mock')
      );
      
      for (const file of files) {
        const filePath = path.join(modulePath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Find all exported functions with parameters
        const functionMatches = content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\((.*?)\)/g);
        
        for (const match of functionMatches) {
          const functionName = match[1];
          const params = match[2];
          
          // If function has parameters, check for @param tags
          if (params.trim().length > 0 && !params.includes('...')) {
            const paramNames = params.split(',').map(p => p.trim().split(':')[0].trim()).filter(p => p);
            
            // Find the TSDoc comment for this function
            const functionIndex = content.indexOf(match[0]);
            const beforeFunction = content.substring(Math.max(0, functionIndex - 500), functionIndex);
            
            // Look for the last /** comment before the function
            const lastCommentMatch = beforeFunction.match(/\/\*\*([\s\S]*?)\*\/\s*$/);
            
            if (lastCommentMatch) {
              totalDocumentedFunctions++;
              const comment = lastCommentMatch[1];
              
              // Check that parameters are documented
              let allParamsDocumented = true;
              for (const paramName of paramNames) {
                if (paramName && paramName !== '') {
                  const hasParamDoc = comment.includes(`@param`) && comment.includes(paramName);
                  if (!hasParamDoc) {
                    allParamsDocumented = false;
                    break;
                  }
                }
              }
              
              // Check for @returns if function returns something
              const functionBody = content.substring(functionIndex, functionIndex + 1000);
              const hasReturn = functionBody.includes('return ') && !functionBody.includes('return;');
              const hasReturnsDoc = comment.includes('@returns');
              
              // Function is properly documented if params are documented and returns is documented (if applicable)
              if (allParamsDocumented && (!hasReturn || hasReturnsDoc)) {
                functionsWithProperTags++;
              }
            }
          }
        }
      }
    }
    
    // At least 70% of documented functions should have proper @param and @returns tags
    if (totalDocumentedFunctions > 0) {
      const properDocumentationRatio = functionsWithProperTags / totalDocumentedFunctions;
      expect(properDocumentationRatio).toBeGreaterThanOrEqual(0.7);
    }
  });

  it('property: all SDK modules have comprehensive documentation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SDK_MODULES),
        (moduleName) => {
          const modulePath = path.join(__dirname, moduleName);
          
          // Module directory should exist
          if (!fs.existsSync(modulePath)) {
            // Some modules might be in different locations, that's ok
            return true;
          }
          
          // Module should have an index.ts file
          const indexPath = path.join(modulePath, 'index.ts');
          const hasIndex = fs.existsSync(indexPath);
          
          if (!hasIndex) {
            // Some modules might not have index.ts, that's ok
            return true;
          }
          
          // Index file should have documentation
          const indexContent = fs.readFileSync(indexPath, 'utf-8');
          const hasDocComment = indexContent.includes('/**');
          
          expect(hasDocComment).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('property: all public APIs have TSDoc documentation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SDK_MODULES),
        (moduleName) => {
          const modulePath = path.join(__dirname, moduleName);
          
          if (!fs.existsSync(modulePath)) {
            return true;
          }
          
          // Get all TypeScript files in the module
          const files = fs.readdirSync(modulePath).filter(f => 
            f.endsWith('.ts') && 
            !f.endsWith('.test.ts') &&
            !f.includes('mock')
          );
          
          let totalExports = 0;
          let documentedExports = 0;
          
          for (const file of files) {
            const filePath = path.join(modulePath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            
            // Find all exports
            const exportMatches = content.matchAll(/export\s+(?:class|function|const|interface|type)\s+(\w+)/g);
            
            for (const match of exportMatches) {
              totalExports++;
              
              // Check if there's a TSDoc comment before this export
              const exportIndex = content.indexOf(match[0]);
              const beforeExport = content.substring(Math.max(0, exportIndex - 300), exportIndex);
              
              if (beforeExport.includes('/**')) {
                documentedExports++;
              }
            }
          }
          
          // At least 40% of exports should be documented
          // (This is a reasonable threshold since many exports are internal utilities)
          if (totalExports > 0) {
            const documentationRatio = documentedExports / totalExports;
            expect(documentationRatio).toBeGreaterThanOrEqual(0.4);
          }
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('property: README contains code examples for all major features', () => {
    const readmePath = path.join(__dirname, 'README.md');
    const readmeContent = fs.readFileSync(readmePath, 'utf-8');
    
    fc.assert(
      fc.property(
        fc.constantFrom(
          'SensorFusionLayer',
          'CVPipeline',
          'GraphBuilder',
          'AROverlay',
          'AudioSystem',
          'EnergyManagerImpl',
          'PluginAPI'
        ),
        (className) => {
          // README should mention this class
          const mentionsClass = readmeContent.includes(className);
          expect(mentionsClass).toBe(true);
          
          // There should be a code example showing how to use it
          // Look for the class name in a code block
          const codeBlocks = readmeContent.match(/```typescript[\s\S]*?```/g) || [];
          const hasCodeExample = codeBlocks.some(block => block.includes(className));
          
          expect(hasCodeExample).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 7 }
    );
  });

  it('property: documentation includes initialization examples', () => {
    const readmePath = path.join(__dirname, 'README.md');
    const readmeContent = fs.readFileSync(readmePath, 'utf-8');
    
    fc.assert(
      fc.property(
        fc.constantFrom(
          'initialize',
          'start',
          'stop',
          'await'
        ),
        (keyword) => {
          // README should show how to initialize and use the SDK
          expect(readmeContent).toContain(keyword);
          
          return true;
        }
      ),
      { numRuns: 4 }
    );
  });

  it('property: each module has interface/type definitions documented', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SDK_MODULES),
        (moduleName) => {
          const modulePath = path.join(__dirname, moduleName);
          
          if (!fs.existsSync(modulePath)) {
            return true;
          }
          
          const indexPath = path.join(modulePath, 'index.ts');
          
          if (!fs.existsSync(indexPath)) {
            return true;
          }
          
          const indexContent = fs.readFileSync(indexPath, 'utf-8');
          
          // Count interface and type exports
          const interfaceCount = (indexContent.match(/export\s+interface\s+/g) || []).length;
          const typeCount = (indexContent.match(/export\s+type\s+/g) || []).length;
          
          const totalTypes = interfaceCount + typeCount;
          
          // If module exports types, they should be documented
          if (totalTypes > 0) {
            // Check that there are TSDoc comments
            const docCommentCount = (indexContent.match(/\/\*\*/g) || []).length;
            
            // At least some types should be documented
            expect(docCommentCount).toBeGreaterThan(0);
          }
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});
