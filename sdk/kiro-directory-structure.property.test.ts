import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

/**
 * **Feature: nightshift-navigator, Property 59: .kiro directory structure**
 * **Validates: Requirements 12.4**
 * 
 * For any time during development, the .kiro directory should exist and contain
 * specs, steering rules, agent hooks, and workflows subdirectories.
 */
describe('Property 59: .kiro directory structure', () => {
  
  const projectRoot = path.resolve(__dirname, '..');
  const kiroPath = path.join(projectRoot, '.kiro');

  it('should have .kiro directory at project root', () => {
    expect(fs.existsSync(kiroPath), '.kiro directory should exist').toBe(true);
    expect(fs.statSync(kiroPath).isDirectory(), '.kiro should be a directory').toBe(true);
  });

  it('should have all required subdirectories in .kiro', () => {
    const requiredSubdirs = ['specs', 'steering', 'hooks', 'workflows'];
    
    requiredSubdirs.forEach(subdir => {
      const subdirPath = path.join(kiroPath, subdir);
      expect(fs.existsSync(subdirPath), `.kiro/${subdir} should exist`).toBe(true);
      expect(fs.statSync(subdirPath).isDirectory(), `.kiro/${subdir} should be a directory`).toBe(true);
    });
  });

  it('should have specs directory with nightshift-navigator spec', () => {
    const specsPath = path.join(kiroPath, 'specs');
    const nightshiftSpecPath = path.join(specsPath, 'nightshift-navigator');
    
    expect(fs.existsSync(nightshiftSpecPath), 'nightshift-navigator spec directory should exist').toBe(true);
    
    // Check for required spec files
    const requiredFiles = ['requirements.md', 'design.md', 'tasks.md'];
    requiredFiles.forEach(file => {
      const filePath = path.join(nightshiftSpecPath, file);
      expect(fs.existsSync(filePath), `${file} should exist in spec directory`).toBe(true);
    });
  });

  it('should have steering directory with steering rules', () => {
    const steeringPath = path.join(kiroPath, 'steering');
    
    expect(fs.existsSync(steeringPath)).toBe(true);
    
    // Check that steering directory contains at least one file
    const steeringContents = fs.readdirSync(steeringPath);
    expect(steeringContents.length).toBeGreaterThan(0);
  });

  it('should have hooks directory', () => {
    const hooksPath = path.join(kiroPath, 'hooks');
    
    expect(fs.existsSync(hooksPath)).toBe(true);
    expect(fs.statSync(hooksPath).isDirectory()).toBe(true);
  });

  it('should have workflows directory', () => {
    const workflowsPath = path.join(kiroPath, 'workflows');
    
    expect(fs.existsSync(workflowsPath)).toBe(true);
    expect(fs.statSync(workflowsPath).isDirectory()).toBe(true);
  });

  it('property: all required .kiro subdirectories should exist', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('specs', 'steering', 'hooks', 'workflows'),
        (subdirName) => {
          const subdirPath = path.join(kiroPath, subdirName);
          return fs.existsSync(subdirPath) && fs.statSync(subdirPath).isDirectory();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: spec files should have .md extension', () => {
    const specsPath = path.join(kiroPath, 'specs');
    
    if (!fs.existsSync(specsPath)) {
      return; // Skip if specs directory doesn't exist
    }

    const getAllSpecFiles = (dir: string, fileList: string[] = []): string[] => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      files.forEach(file => {
        const filePath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          getAllSpecFiles(filePath, fileList);
        } else if (file.isFile()) {
          fileList.push(filePath);
        }
      });
      
      return fileList;
    };

    const specFiles = getAllSpecFiles(specsPath);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...specFiles),
        (filePath) => {
          // All spec files should be markdown files
          return filePath.endsWith('.md');
        }
      ),
      { numRuns: Math.min(100, specFiles.length) }
    );
  });

  it('property: .kiro directory structure should be consistent', () => {
    // This property verifies that the .kiro directory maintains its structure
    // across multiple checks (simulating different points in time during development)
    
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (iteration) => {
          // Check that .kiro and all subdirectories exist on each iteration
          const requiredPaths = [
            kiroPath,
            path.join(kiroPath, 'specs'),
            path.join(kiroPath, 'steering'),
            path.join(kiroPath, 'hooks'),
            path.join(kiroPath, 'workflows')
          ];
          
          return requiredPaths.every(p => fs.existsSync(p) && fs.statSync(p).isDirectory());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: spec directory should contain at least one spec', () => {
    const specsPath = path.join(kiroPath, 'specs');
    
    fc.assert(
      fc.property(
        fc.constant(specsPath),
        (path) => {
          if (!fs.existsSync(path)) return false;
          
          const contents = fs.readdirSync(path, { withFileTypes: true });
          const specDirs = contents.filter(item => item.isDirectory());
          
          // Should have at least one spec directory
          return specDirs.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: each spec should have requirements, design, and tasks files', () => {
    const specsPath = path.join(kiroPath, 'specs');
    
    if (!fs.existsSync(specsPath)) {
      return; // Skip if specs directory doesn't exist
    }

    const specDirs = fs.readdirSync(specsPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);

    if (specDirs.length === 0) {
      return; // Skip if no spec directories
    }

    fc.assert(
      fc.property(
        fc.constantFrom(...specDirs),
        (specName) => {
          const specPath = path.join(specsPath, specName);
          const requiredFiles = ['requirements.md', 'design.md', 'tasks.md'];
          
          return requiredFiles.every(file => {
            const filePath = path.join(specPath, file);
            return fs.existsSync(filePath);
          });
        }
      ),
      { numRuns: Math.min(100, specDirs.length) }
    );
  });
});
