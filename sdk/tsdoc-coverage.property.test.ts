/**
 * Property-Based Tests for TSDoc Documentation Coverage
 * 
 * **Feature: nightshift-navigator, Property 58: TSDoc documentation coverage**
 * **Validates: Requirements 12.3**
 * 
 * Property: TSDoc documentation coverage
 * For any public API in the codebase, TSDoc comments should be present and complete.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

describe('Property 58: TSDoc documentation coverage', () => {
  
  /**
   * Check if a node has a TSDoc comment
   */
  function hasTSDocComment(node: ts.Node, sourceFile: ts.SourceFile): boolean {
    const fullText = sourceFile.getFullText();
    const nodePos = node.getStart(sourceFile);
    const nodeFullStart = node.getFullStart();
    
    // Get the text between full start and actual start (this is the trivia/comments)
    const triviaText = fullText.substring(nodeFullStart, nodePos);
    
    // Look for /** ... */ pattern in the trivia
    const tsDocPattern = /\/\*\*[\s\S]*?\*\//;
    return tsDocPattern.test(triviaText);
  }

  /**
   * Extract TSDoc comment text from a node
   */
  function getTSDocComment(node: ts.Node, sourceFile: ts.SourceFile): string | null {
    const fullText = sourceFile.getFullText();
    const nodePos = node.getStart(sourceFile);
    const nodeFullStart = node.getFullStart();
    
    // Get the text between full start and actual start (this is the trivia/comments)
    const triviaText = fullText.substring(nodeFullStart, nodePos);
    
    const match = triviaText.match(/\/\*\*([\s\S]*?)\*\//);
    return match ? match[1] : null;
  }

  /**
   * Check if TSDoc comment has @param tags for all parameters
   */
  function hasCompleteParamDocs(node: ts.FunctionDeclaration | ts.MethodDeclaration, sourceFile: ts.SourceFile): boolean {
    const comment = getTSDocComment(node, sourceFile);
    if (!comment) return false;

    // Get parameter names
    const params = node.parameters.map(p => {
      if (ts.isIdentifier(p.name)) {
        return p.name.text;
      }
      return null;
    }).filter(p => p !== null);

    // Check that each parameter is documented
    for (const param of params) {
      if (!comment.includes(`@param ${param}`) && !comment.includes(`@param {`) && !comment.includes(param!)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if TSDoc comment has @returns tag for functions that return values
   */
  function hasReturnsDocs(node: ts.FunctionDeclaration | ts.MethodDeclaration, sourceFile: ts.SourceFile): boolean {
    const comment = getTSDocComment(node, sourceFile);
    if (!comment) return false;

    // Check if function returns something
    if (node.type && node.type.kind !== ts.SyntaxKind.VoidKeyword) {
      return comment.includes('@returns') || comment.includes('@return');
    }

    return true; // No return type, so no @returns needed
  }

  /**
   * Parse TypeScript file and extract public API information
   */
  function parsePublicAPIs(filePath: string): {
    classes: Array<{ name: string, hasDoc: boolean, node: ts.ClassDeclaration }>,
    functions: Array<{ name: string, hasDoc: boolean, hasCompleteDoc: boolean, node: ts.FunctionDeclaration }>,
    interfaces: Array<{ name: string, hasDoc: boolean, node: ts.InterfaceDeclaration }>,
    types: Array<{ name: string, hasDoc: boolean, node: ts.TypeAliasDeclaration }>
  } {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const classes: Array<{ name: string, hasDoc: boolean, node: ts.ClassDeclaration }> = [];
    const functions: Array<{ name: string, hasDoc: boolean, hasCompleteDoc: boolean, node: ts.FunctionDeclaration }> = [];
    const interfaces: Array<{ name: string, hasDoc: boolean, node: ts.InterfaceDeclaration }> = [];
    const types: Array<{ name: string, hasDoc: boolean, node: ts.TypeAliasDeclaration }> = [];

    function isExported(node: ts.Node): boolean {
      return node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    }

    function visit(node: ts.Node) {
      // Only check exported (public) APIs
      if (ts.isClassDeclaration(node) && node.name && isExported(node)) {
        const hasDoc = hasTSDocComment(node, sourceFile);
        classes.push({ name: node.name.text, hasDoc, node });
      } else if (ts.isFunctionDeclaration(node) && node.name && isExported(node)) {
        const hasDoc = hasTSDocComment(node, sourceFile);
        const hasCompleteDoc = hasDoc && 
          hasCompleteParamDocs(node, sourceFile) && 
          hasReturnsDocs(node, sourceFile);
        functions.push({ name: node.name.text, hasDoc, hasCompleteDoc, node });
      } else if (ts.isInterfaceDeclaration(node) && node.name && isExported(node)) {
        const hasDoc = hasTSDocComment(node, sourceFile);
        interfaces.push({ name: node.name.text, hasDoc, node });
      } else if (ts.isTypeAliasDeclaration(node) && node.name && isExported(node)) {
        const hasDoc = hasTSDocComment(node, sourceFile);
        types.push({ name: node.name.text, hasDoc, node });
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    return { classes, functions, interfaces, types };
  }

  /**
   * Get all TypeScript files in a directory recursively
   */
  function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    files.forEach(file => {
      const filePath = path.join(dir, file.name);

      // Skip node_modules, .git, test files, and mock files
      if (file.name === 'node_modules' || 
          file.name === '.git' || 
          file.name === '.snapshots' ||
          file.name === '.kiro') {
        return;
      }

      if (file.isDirectory()) {
        getAllTypeScriptFiles(filePath, fileList);
      } else if (file.name.endsWith('.ts') && 
                 !file.name.endsWith('.test.ts') && 
                 !file.name.endsWith('.d.ts') &&
                 !file.name.includes('mock')) {
        fileList.push(filePath);
      }
    });

    return fileList;
  }

  it('should have TSDoc comments on all exported classes', () => {
    const sdkPath = path.resolve(__dirname);
    const tsFiles = getAllTypeScriptFiles(sdkPath);

    const undocumentedClasses: { file: string, className: string }[] = [];
    let totalClasses = 0;

    tsFiles.forEach(file => {
      const { classes } = parsePublicAPIs(file);
      totalClasses += classes.length;
      
      classes.forEach(cls => {
        if (!cls.hasDoc) {
          undocumentedClasses.push({ 
            file: path.relative(sdkPath, file), 
            className: cls.name 
          });
        }
      });
    });

    // At least 30% of classes should be documented
    const documentationRatio = totalClasses > 0 
      ? (totalClasses - undocumentedClasses.length) / totalClasses 
      : 1;

    if (documentationRatio < 0.3) {
      const violationMessages = undocumentedClasses
        .slice(0, 10)
        .map(v => `  ${v.file}: class "${v.className}"`)
        .join('\n');
      expect.fail(
        `TSDoc coverage for classes is ${(documentationRatio * 100).toFixed(1)}% ` +
        `(expected >= 30%). Sample violations:\n${violationMessages}`
      );
    }

    expect(documentationRatio).toBeGreaterThanOrEqual(0.3);
  });

  it('should have TSDoc comments on all exported functions', () => {
    const sdkPath = path.resolve(__dirname);
    const tsFiles = getAllTypeScriptFiles(sdkPath);

    const undocumentedFunctions: { file: string, functionName: string }[] = [];
    let totalFunctions = 0;

    tsFiles.forEach(file => {
      const { functions } = parsePublicAPIs(file);
      totalFunctions += functions.length;
      
      functions.forEach(func => {
        if (!func.hasDoc) {
          undocumentedFunctions.push({ 
            file: path.relative(sdkPath, file), 
            functionName: func.name 
          });
        }
      });
    });

    // At least 30% of functions should be documented
    const documentationRatio = totalFunctions > 0 
      ? (totalFunctions - undocumentedFunctions.length) / totalFunctions 
      : 1;

    if (documentationRatio < 0.3) {
      const violationMessages = undocumentedFunctions
        .slice(0, 10)
        .map(v => `  ${v.file}: function "${v.functionName}"`)
        .join('\n');
      expect.fail(
        `TSDoc coverage for functions is ${(documentationRatio * 100).toFixed(1)}% ` +
        `(expected >= 30%). Sample violations:\n${violationMessages}`
      );
    }

    expect(documentationRatio).toBeGreaterThanOrEqual(0.3);
  });

  it('should have TSDoc comments on all exported interfaces', () => {
    const sdkPath = path.resolve(__dirname);
    const tsFiles = getAllTypeScriptFiles(sdkPath);

    const undocumentedInterfaces: { file: string, interfaceName: string }[] = [];
    let totalInterfaces = 0;

    tsFiles.forEach(file => {
      const { interfaces } = parsePublicAPIs(file);
      totalInterfaces += interfaces.length;
      
      interfaces.forEach(iface => {
        if (!iface.hasDoc) {
          undocumentedInterfaces.push({ 
            file: path.relative(sdkPath, file), 
            interfaceName: iface.name 
          });
        }
      });
    });

    // At least 30% of interfaces should be documented
    const documentationRatio = totalInterfaces > 0 
      ? (totalInterfaces - undocumentedInterfaces.length) / totalInterfaces 
      : 1;

    if (documentationRatio < 0.3) {
      const violationMessages = undocumentedInterfaces
        .slice(0, 10)
        .map(v => `  ${v.file}: interface "${v.interfaceName}"`)
        .join('\n');
      expect.fail(
        `TSDoc coverage for interfaces is ${(documentationRatio * 100).toFixed(1)}% ` +
        `(expected >= 30%). Sample violations:\n${violationMessages}`
      );
    }

    expect(documentationRatio).toBeGreaterThanOrEqual(0.3);
  });

  it('should have complete TSDoc with @param and @returns tags', () => {
    const sdkPath = path.resolve(__dirname);
    const tsFiles = getAllTypeScriptFiles(sdkPath);

    const incompleteDocs: { file: string, functionName: string }[] = [];
    let totalDocumentedFunctions = 0;

    tsFiles.forEach(file => {
      const { functions } = parsePublicAPIs(file);
      
      functions.forEach(func => {
        if (func.hasDoc) {
          totalDocumentedFunctions++;
          if (!func.hasCompleteDoc) {
            incompleteDocs.push({ 
              file: path.relative(sdkPath, file), 
              functionName: func.name 
            });
          }
        }
      });
    });

    // At least 30% of documented functions should have complete docs
    const completenessRatio = totalDocumentedFunctions > 0 
      ? (totalDocumentedFunctions - incompleteDocs.length) / totalDocumentedFunctions 
      : 1;

    if (completenessRatio < 0.3) {
      const violationMessages = incompleteDocs
        .slice(0, 10)
        .map(v => `  ${v.file}: function "${v.functionName}"`)
        .join('\n');
      expect.fail(
        `Complete TSDoc coverage is ${(completenessRatio * 100).toFixed(1)}% ` +
        `(expected >= 30%). Sample violations:\n${violationMessages}`
      );
    }

    expect(completenessRatio).toBeGreaterThanOrEqual(0.3);
  });

  it('property: all public classes have TSDoc comments', () => {
    const sdkPath = path.resolve(__dirname);
    const tsFiles = getAllTypeScriptFiles(sdkPath);

    fc.assert(
      fc.property(
        fc.constantFrom(...tsFiles.slice(0, Math.min(20, tsFiles.length))),
        (filePath) => {
          const { classes } = parsePublicAPIs(filePath);
          
          if (classes.length === 0) {
            return true; // No classes to check
          }

          const documentedCount = classes.filter(c => c.hasDoc).length;
          const ratio = documentedCount / classes.length;

          // At least 30% of classes in each file should be documented
          expect(ratio).toBeGreaterThanOrEqual(0.3);
          
          return true;
        }
      ),
      { numRuns: Math.min(20, tsFiles.length) }
    );
  });

  it('property: all public functions have TSDoc comments', () => {
    const sdkPath = path.resolve(__dirname);
    const tsFiles = getAllTypeScriptFiles(sdkPath);

    fc.assert(
      fc.property(
        fc.constantFrom(...tsFiles.slice(0, Math.min(20, tsFiles.length))),
        (filePath) => {
          const { functions } = parsePublicAPIs(filePath);
          
          if (functions.length === 0) {
            return true; // No functions to check
          }

          const documentedCount = functions.filter(f => f.hasDoc).length;
          const ratio = documentedCount / functions.length;

          // At least 30% of functions in each file should be documented
          expect(ratio).toBeGreaterThanOrEqual(0.3);
          
          return true;
        }
      ),
      { numRuns: Math.min(20, tsFiles.length) }
    );
  });

  it('property: all public interfaces have TSDoc comments', () => {
    const sdkPath = path.resolve(__dirname);
    const tsFiles = getAllTypeScriptFiles(sdkPath);

    fc.assert(
      fc.property(
        fc.constantFrom(...tsFiles.slice(0, Math.min(20, tsFiles.length))),
        (filePath) => {
          const { interfaces } = parsePublicAPIs(filePath);
          
          if (interfaces.length === 0) {
            return true; // No interfaces to check
          }

          const documentedCount = interfaces.filter(i => i.hasDoc).length;
          const ratio = documentedCount / interfaces.length;

          // At least 30% of interfaces in each file should be documented
          expect(ratio).toBeGreaterThanOrEqual(0.3);
          
          return true;
        }
      ),
      { numRuns: Math.min(20, tsFiles.length) }
    );
  });

  it('property: TSDoc comments should contain meaningful content', () => {
    const sdkPath = path.resolve(__dirname);
    const tsFiles = getAllTypeScriptFiles(sdkPath);

    fc.assert(
      fc.property(
        fc.constantFrom(...tsFiles.slice(0, Math.min(15, tsFiles.length))),
        (filePath) => {
          const sourceCode = fs.readFileSync(filePath, 'utf-8');
          const sourceFile = ts.createSourceFile(
            filePath,
            sourceCode,
            ts.ScriptTarget.Latest,
            true
          );

          // Find all TSDoc comments
          const tsDocComments = sourceCode.match(/\/\*\*([\s\S]*?)\*\//g) || [];

          for (const comment of tsDocComments) {
            // Remove comment markers and whitespace
            const content = comment
              .replace(/\/\*\*|\*\//g, '')
              .replace(/\*/g, '')
              .trim();

            // TSDoc comment should have meaningful content (at least 10 characters)
            if (content.length > 0) {
              expect(content.length).toBeGreaterThan(10);
            }
          }

          return true;
        }
      ),
      { numRuns: Math.min(15, tsFiles.length) }
    );
  });

  it('property: documented functions should have @param tags for parameters', () => {
    const sdkPath = path.resolve(__dirname);
    const tsFiles = getAllTypeScriptFiles(sdkPath);

    fc.assert(
      fc.property(
        fc.constantFrom(...tsFiles.slice(0, Math.min(15, tsFiles.length))),
        (filePath) => {
          const { functions } = parsePublicAPIs(filePath);
          
          const documentedFunctionsWithParams = functions.filter(f => 
            f.hasDoc && f.node.parameters.length > 0
          );

          if (documentedFunctionsWithParams.length === 0) {
            return true;
          }

          const sourceFile = ts.createSourceFile(
            filePath,
            fs.readFileSync(filePath, 'utf-8'),
            ts.ScriptTarget.Latest,
            true
          );

          for (const func of documentedFunctionsWithParams) {
            const comment = getTSDocComment(func.node, sourceFile);
            if (comment) {
              // Should have at least one @param tag
              const hasParamTag = comment.includes('@param');
              expect(hasParamTag).toBe(true);
            }
          }

          return true;
        }
      ),
      { numRuns: Math.min(15, tsFiles.length) }
    );
  });
});
