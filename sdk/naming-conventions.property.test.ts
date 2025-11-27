import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * **Feature: nightshift-navigator, Property 57: Naming convention compliance**
 * **Validates: Requirements 12.2**
 * 
 * For any class or function in the codebase, the name should follow PascalCase for classes
 * and camelCase for functions.
 */
describe('Property 57: Naming convention compliance', () => {
  
  /**
   * Check if a name follows PascalCase convention
   */
  function isPascalCase(name: string): boolean {
    if (!name || name.length === 0) return false;
    // PascalCase: starts with uppercase, contains only letters and numbers
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
  }

  /**
   * Check if a name follows camelCase convention
   */
  function isCamelCase(name: string): boolean {
    if (!name || name.length === 0) return false;
    // camelCase: starts with lowercase, contains only letters and numbers
    return /^[a-z][a-zA-Z0-9]*$/.test(name);
  }

  /**
   * Parse TypeScript file and extract class and function names
   */
  function parseTypeScriptFile(filePath: string): { classes: string[], functions: string[], interfaces: string[] } {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const classes: string[] = [];
    const functions: string[] = [];
    const interfaces: string[] = [];

    function visit(node: ts.Node) {
      if (ts.isClassDeclaration(node) && node.name) {
        classes.push(node.name.text);
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        functions.push(node.name.text);
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        interfaces.push(node.name.text);
      } else if (ts.isVariableStatement(node)) {
        // Check for arrow functions assigned to const
        node.declarationList.declarations.forEach(decl => {
          if (ts.isVariableDeclaration(decl) && decl.name && ts.isIdentifier(decl.name)) {
            if (decl.initializer && ts.isArrowFunction(decl.initializer)) {
              functions.push(decl.name.text);
            }
          }
        });
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    return { classes, functions, interfaces };
  }

  /**
   * Get all TypeScript files in a directory recursively
   */
  function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    files.forEach(file => {
      const filePath = path.join(dir, file.name);

      // Skip node_modules, .git, and test files for this check
      if (file.name === 'node_modules' || file.name === '.git' || file.name === '.snapshots') {
        return;
      }

      if (file.isDirectory()) {
        getAllTypeScriptFiles(filePath, fileList);
      } else if (file.name.endsWith('.ts') && !file.name.endsWith('.d.ts')) {
        fileList.push(filePath);
      }
    });

    return fileList;
  }

  it('should have all classes following PascalCase convention', () => {
    const sdkPath = path.resolve(__dirname);
    const tsFiles = getAllTypeScriptFiles(sdkPath);

    const violations: { file: string, className: string }[] = [];

    tsFiles.forEach(file => {
      const { classes } = parseTypeScriptFile(file);
      classes.forEach(className => {
        if (!isPascalCase(className)) {
          violations.push({ file: path.relative(sdkPath, file), className });
        }
      });
    });

    if (violations.length > 0) {
      const violationMessages = violations.map(v => `  ${v.file}: class "${v.className}"`).join('\n');
      expect.fail(`Found ${violations.length} class naming violations:\n${violationMessages}`);
    }

    expect(violations.length).toBe(0);
  });

  it('should have all interfaces following PascalCase convention', () => {
    const sdkPath = path.resolve(__dirname);
    const tsFiles = getAllTypeScriptFiles(sdkPath);

    const violations: { file: string, interfaceName: string }[] = [];

    tsFiles.forEach(file => {
      const { interfaces } = parseTypeScriptFile(file);
      interfaces.forEach(interfaceName => {
        if (!isPascalCase(interfaceName)) {
          violations.push({ file: path.relative(sdkPath, file), interfaceName });
        }
      });
    });

    if (violations.length > 0) {
      const violationMessages = violations.map(v => `  ${v.file}: interface "${v.interfaceName}"`).join('\n');
      expect.fail(`Found ${violations.length} interface naming violations:\n${violationMessages}`);
    }

    expect(violations.length).toBe(0);
  });

  it('should have all functions following camelCase convention', () => {
    const sdkPath = path.resolve(__dirname);
    const tsFiles = getAllTypeScriptFiles(sdkPath);

    const violations: { file: string, functionName: string }[] = [];

    tsFiles.forEach(file => {
      const { functions } = parseTypeScriptFile(file);
      functions.forEach(functionName => {
        if (!isCamelCase(functionName)) {
          violations.push({ file: path.relative(sdkPath, file), functionName });
        }
      });
    });

    if (violations.length > 0) {
      const violationMessages = violations.map(v => `  ${v.file}: function "${v.functionName}"`).join('\n');
      expect.fail(`Found ${violations.length} function naming violations:\n${violationMessages}`);
    }

    expect(violations.length).toBe(0);
  });

  it('property: generated class names should follow PascalCase', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/),
        (className) => {
          return isPascalCase(className);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: generated function names should follow camelCase', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
        (functionName) => {
          return isCamelCase(functionName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: PascalCase names should not be valid camelCase', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z][a-zA-Z0-9]+$/),
        (pascalName) => {
          // A proper PascalCase name should not be camelCase
          return !isCamelCase(pascalName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: camelCase names should not be valid PascalCase', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z][a-zA-Z0-9]+$/),
        (camelName) => {
          // A proper camelCase name should not be PascalCase
          return !isPascalCase(camelName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: naming conventions should be mutually exclusive', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
        (name) => {
          const isPascal = isPascalCase(name);
          const isCamel = isCamelCase(name);
          
          // A name should be either PascalCase or camelCase, but not both
          // (unless it's a single letter, which we'll allow)
          if (name.length === 1) {
            return true;
          }
          
          return isPascal !== isCamel;
        }
      ),
      { numRuns: 100 }
    );
  });
});
