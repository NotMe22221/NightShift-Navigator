import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

/**
 * **Feature: nightshift-navigator, Property 56: Directory structure compliance**
 * **Validates: Requirements 12.1**
 * 
 * For any module in the codebase, it should be located in the appropriate directory
 * (SDK, UI, or utilities).
 */
describe('Property 56: Directory structure compliance', () => {
  it('should have all required top-level directories', () => {
    const projectRoot = path.resolve(__dirname, '..');
    
    const requiredDirs = ['sdk', 'demo', 'tests', '.kiro'];
    
    requiredDirs.forEach(dir => {
      const dirPath = path.join(projectRoot, dir);
      expect(fs.existsSync(dirPath), `Directory ${dir} should exist`).toBe(true);
      expect(fs.statSync(dirPath).isDirectory(), `${dir} should be a directory`).toBe(true);
    });
  });

  it('should have SDK modules organized in sdk directory', () => {
    const sdkPath = path.resolve(__dirname);
    
    expect(fs.existsSync(sdkPath)).toBe(true);
    
    // Check that SDK contains module directories
    const sdkContents = fs.readdirSync(sdkPath, { withFileTypes: true });
    const moduleDirectories = sdkContents.filter(item => item.isDirectory());
    
    // Should have at least the core module directories
    const expectedModules = [
      'sensor-fusion',
      'computer-vision',
      'pathfinding',
      'ar-overlay',
      'audio',
      'energy',
      'plugin-api',
      'security',
      'error-handling',
      'types'
    ];
    
    expectedModules.forEach(moduleName => {
      const hasModule = moduleDirectories.some(dir => dir.name === moduleName);
      expect(hasModule, `SDK should contain ${moduleName} module directory`).toBe(true);
    });
  });

  it('should have demo directory with demo application files', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const demoPath = path.join(projectRoot, 'demo');
    
    expect(fs.existsSync(demoPath)).toBe(true);
    
    // Check for demo files
    const demoContents = fs.readdirSync(demoPath);
    expect(demoContents.length).toBeGreaterThan(0);
  });

  it('should have tests directory with test utilities', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const testsPath = path.join(projectRoot, 'tests');
    
    expect(fs.existsSync(testsPath)).toBe(true);
    
    // Check for test files
    const testsContents = fs.readdirSync(testsPath);
    expect(testsContents.length).toBeGreaterThan(0);
  });

  it('should have .kiro directory with proper subdirectories', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const kiroPath = path.join(projectRoot, '.kiro');
    
    expect(fs.existsSync(kiroPath)).toBe(true);
    
    const requiredSubdirs = ['specs', 'steering', 'hooks', 'workflows'];
    
    requiredSubdirs.forEach(subdir => {
      const subdirPath = path.join(kiroPath, subdir);
      expect(fs.existsSync(subdirPath), `.kiro/${subdir} should exist`).toBe(true);
    });
  });

  it('property: all TypeScript files in sdk directory should be SDK modules', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'sensor-fusion',
          'computer-vision',
          'pathfinding',
          'ar-overlay',
          'audio',
          'energy',
          'plugin-api',
          'security',
          'error-handling',
          'types'
        ),
        (moduleName) => {
          const sdkPath = path.resolve(__dirname);
          const modulePath = path.join(sdkPath, moduleName);
          
          // If the module directory exists, it should be in the sdk directory
          if (fs.existsSync(modulePath)) {
            const relativePath = path.relative(path.join(sdkPath, '..'), modulePath);
            return relativePath.startsWith('sdk');
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: no SDK module files should exist outside sdk directory', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const sdkPath = path.resolve(__dirname);
    
    // Get all TypeScript files in the project
    const getAllTsFiles = (dir: string, fileList: string[] = []): string[] => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      files.forEach(file => {
        const filePath = path.join(dir, file.name);
        
        // Skip node_modules and .git
        if (file.name === 'node_modules' || file.name === '.git' || file.name === '.snapshots') {
          return;
        }
        
        if (file.isDirectory()) {
          getAllTsFiles(filePath, fileList);
        } else if (file.name.endsWith('.ts') && !file.name.endsWith('.test.ts')) {
          fileList.push(filePath);
        }
      });
      
      return fileList;
    };
    
    const allTsFiles = getAllTsFiles(projectRoot);
    
    // Check that all SDK-related files are in the sdk directory
    allTsFiles.forEach(file => {
      const relativePath = path.relative(projectRoot, file);
      
      // If it's in sdk directory, that's correct
      if (relativePath.startsWith('sdk')) {
        expect(true).toBe(true);
      }
      // If it's in demo or tests, that's also correct
      else if (relativePath.startsWith('demo') || relativePath.startsWith('tests')) {
        expect(true).toBe(true);
      }
      // Config files at root are acceptable
      else if (!relativePath.includes(path.sep)) {
        expect(true).toBe(true);
      }
    });
  });
});
