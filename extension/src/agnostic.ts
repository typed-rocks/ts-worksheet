import {
  AwaitExpression,
  CallExpression,
  ExportedDeclarations,
  ExportDeclaration,
  ExportAssignment,
  VariableStatement,
  Expression,
  ImportDeclaration,
  Node,
  Project,
  SourceFile,
  SyntaxKind,
  ThrowStatement,
  VariableDeclaration,
} from 'ts-morph';
import { DONE_FLAG } from './constants';
import path from 'path';
import os from 'os';

import { HintData, UNDEFINED_FLAG, nodeModules } from './model';

const MAX_LENGTH = 2000;

const allowedChildren: SyntaxKind[] = [
  SyntaxKind.AwaitExpression,
  SyntaxKind.ExpressionStatement,
  SyntaxKind.PostfixUnaryExpression,
  SyntaxKind.PrefixUnaryExpression,
  SyntaxKind.VariableDeclaration,
  SyntaxKind.ThrowStatement,
  SyntaxKind.IfStatement,
  SyntaxKind.SwitchStatement,
];

export function stringifyHintData({ called, prefix, type, variable }: HintData) {
  const fixPrefix = fixUndefined(prefix) ?? '';

  if (type === 'error' && Array.isArray(called)) {
    const [msg, stack] = called;
    return { withVariable: 'Error: ' + msg + ' object: ' + stack, called: called };
  }
  if (type === 'log') {
    const result = called?.join(', ') ?? '';
    const fixedLog = fixUndefined(result);
    return { withVariable: fixPrefix + fixedLog, called: fixedLog };
  }
  const fixedCalled = fixUndefined(called);

  const variableOrEmpty = variable && variable !== UNDEFINED_FLAG ? variable + ' = ' : '';
  return { withVariable: `${variableOrEmpty}${fixPrefix}${fixedCalled}`, called: fixedCalled };
}

export function fixUndefined(str: any) {
  if (typeof str !== 'string') {
    return str;
  }

  return str
    .replaceAll(`"${UNDEFINED_FLAG}"`, 'undefined')
    .replaceAll(UNDEFINED_FLAG, 'undefined')
    .replaceAll(' ', '\u2003')
    .replaceAll(os.EOL, '\\n')
    .replaceAll('"Promise"', 'Promise');
}

export function createWatchFile(
  filePath: string,
  isIdea: boolean,
): {
  usedNodeModules: string[];
  readyFile: string;
  wsFilePath: string;
} {
  const curProject = new Project();
  const currentDirectory = path.dirname(filePath);
  const fileName = path.basename(filePath);

  const wsDataPath = path.join(currentDirectory, `.ws.data.json`);
  const wsFilePath = path.join(currentDirectory, '.ws.' + fileName + '.ts');
  curProject.addSourceFileAtPath(filePath);
  const inputTsFile = curProject.getSourceFile(filePath) as SourceFile;
  const result = getReadyFile(inputTsFile, wsDataPath, isIdea);

  return { readyFile: result.codeString, usedNodeModules: result.usedNodeModules, wsFilePath };
}

function isParentConsoleLog(node: Node) {
  const anyConsoleLogAncestor = node.getAncestors().filter(a => a.isKind(SyntaxKind.CallExpression)).some(a => {
    return a.getText().startsWith('console.');
  });
  return anyConsoleLogAncestor;
}

function addWatchers(node: Node) {
  for (const child of node.getChildren()) {
    addWatchers(child);

  
    if (isConsoleCall(child)) {
      wrapWithLog(child);
      continue;
    }

    if(isParentConsoleLog(child)){
      continue;
    }

    if (!allowedChildren.includes(child.getKind())) {
      continue;
    }
    const text = child.getText();

    if (text.startsWith(DONE_FLAG)) {
      break;
    }

 
    switch (child.getKind()) {
      case SyntaxKind.AwaitExpression: {
        const a = child.asKindOrThrow(SyntaxKind.AwaitExpression);
        wrapWithAwaitWatcher(a);
        break;
      }
      case SyntaxKind.ThrowStatement: {
        wrapWithThrowWatcher(child.asKindOrThrow(SyntaxKind.ThrowStatement));
        break;
      }
      case SyntaxKind.VariableDeclaration: {
        wrapVariableDeclarationWithWatcher(child.asKind(SyntaxKind.VariableDeclaration)!);
        break;
      }
      case SyntaxKind.SwitchStatement: {
        const expression = child.asKind(SyntaxKind.SwitchStatement)?.getExpression()!;
        wrapExpressionWithWatcher(expression);
        break;
      }
      case SyntaxKind.IfStatement: {
        const expression = child.asKind(SyntaxKind.IfStatement)?.getExpression()!;
        wrapExpressionWithWatcher(expression);
        break;
      }
      case SyntaxKind.PostfixUnaryExpression:
      case SyntaxKind.PrefixUnaryExpression: {
        if (!child.getParent()?.isKind(SyntaxKind.ForStatement)) {
          break;
        }
        wrapExpressionWithWatcher(child as Expression);
        break;
      }
      default:
        if(child.getFirstChildByKind(SyntaxKind.YieldExpression)) {
          break;
        }
        if(child.getFirstChild()?.isKind(SyntaxKind.CallExpression) && child.getText().startsWith('mylog')){
          break;
        }
        wrapExpressionWithWatcher(child as Expression);
        break;
    }
  }
}

function isConsoleCall(child: Node) {
  return child.getText().startsWith('console.') && !!child.getFirstDescendantByKind(SyntaxKind.CallExpression);
}

function wrapExpressionWithWatcher(child: Expression) {
  prepareExpression(child, false);
}

function wrapWithLog(child: Node) {
  const text = child.getText();
  const line = child.getStartLineNumber();
  const bracketIndex = text.indexOf('(');
  const endBracketIndex = text.lastIndexOf(')');
  const getFn = text.substring(0, bracketIndex);
  const { suffix } = removeSemicolon(text);
  const called = text.substring(bracketIndex + 1, endBracketIndex);
  const replaceText = `mylog(${getFn}, {type: 'log', called: [${called}], line: ${line}})${suffix}`;

  child.replaceWithText(replaceText);
}

function getArgumentOfConsoleCall(child: Node): string[] {
  return (
    (child.getFirstDescendantByKind(SyntaxKind.CallExpression) as CallExpression)
      ?.getArguments()
      ?.map((arg: Node) => arg.getText()) ?? []
  );
}

function wrapWithAwaitWatcher(expression: AwaitExpression) {
  const line = expression.getStartLineNumber();

  const thereIsAParentWithValues = !!allowedChildren.find((c) => !!expression.getFirstAncestorByKind(c));
  const parentIsConsole = !!expression.getAncestors().filter((an: Node) => isConsoleCall(an)).length;
  const hide = parentIsConsole || thereIsAParentWithValues;
  const { cleanedText, suffix } = removeSemicolon(expression.getText());
  const called = `async () => (${cleanedText})`;
  const replaceText = `await tsWorksheetWatch({stringed: 'empty', type: 'expression', hide: ${hide},  called: ${called}, line: ${line}})${suffix}`;
  expression.replaceWithText(replaceText);
}

function wrapWithThrowWatcher(child: ThrowStatement) {
  const line = child.getStartLineNumber();
  const text = child.getText().substring('throw '.length);
  const { cleanedText, suffix } = removeSemicolon(text);
  const called = `() => (${cleanedText})`;
  const type = 'throw';
  const replaceText = `tsWorksheetWatch({type: '${type}', stringed: 'empty', variable: undefined, called: ${called}, line: ${line}})${suffix}`;

  child.replaceWithText(replaceText);
}

function wrapVariableDeclarationWithWatcher(child: VariableDeclaration) {
  const parent = child.getParent()?.getParent();
  if (parent?.getKind() !== SyntaxKind.VariableStatement || !child.getText().includes('=')) {
    return;
  }
  const expression = child.getLastChild()!! as Expression;
  const variable = child.getChildAtIndex(0).getText();
  prepareExpression(expression, true, variable);
}

function prepareExpression(expression: Expression, isVariable: boolean, variableName?: string) {
  const line = expression.getStartLineNumber();

  const childHasAwait = !!expression.getDescendantsOfKind(SyntaxKind.AwaitExpression).length;
  const hasAwait = childHasAwait;

  const { cleanedText, suffix } = removeSemicolon(expression.getText());
  const called = `${hasAwait ? 'async ' : ''}() => (${cleanedText})`;
  const type = isVariable ? 'variable' : 'expression';
  const variable = isVariable ? `'${variableName}'` : 'undefined';
  const replaceText = `${hasAwait ? 'await' : ''} tsWorksheetWatch({stringed: 'empty', type: '${type}', variable: ${variable},  called: ${called}, line: ${line}})${suffix}`;
  expression.replaceWithText(replaceText);
}

function removeSemicolon(text: string): {
  cleanedText: string;
  suffix: string;
} {
  const hasSemicolon = text.endsWith(';');
  const suffix = hasSemicolon ? ';' : '';
  const removedSemicolon = hasSemicolon ? text.substring(0, text.length - 1) : text;
  return { cleanedText: removedSemicolon, suffix };
}

const joinedPipe = new RegExp(`(${nodeModules.map((m) => `['"]${m}\\/{0,1}.*['"]`).join('|')})`);

function removeExportStart(node: Node) {
  const withoutExport = node
    .getText()
    .replace(/^export default /, '')
    .replace(/^export /, '');
  node.replaceWithText(withoutExport);
}

function addSemicolonsWhereNeeded(sourceFile: SourceFile) {
  sourceFile.getVariableStatements().forEach((v: VariableStatement) => {
    const endsWithSemicolon = v.getText().endsWith(';');
    if (!endsWithSemicolon) {
      v.replaceWithText(v.getText() + ';');
    }
  });
}

function getReadyFile(realSourceFile: SourceFile, wsFilePath: string, isIdea: boolean) {
  const sourceFile = realSourceFile.copy('.toedit.ts', { overwrite: true });
  const osDependentPath = os.platform() === 'win32' ? wsFilePath.replaceAll('\\', '\\\\') : wsFilePath;

  removeExports(sourceFile);
  addSemicolonsWhereNeeded(sourceFile);

  addWatchers(sourceFile);
  // leave here. imports only after running the watchers.
  const { usedNodeModules, importsText } = fixImports(sourceFile);
  return { usedNodeModules, codeString: surroundCode(importsText, sourceFile.getText(), osDependentPath, isIdea) };
}

export function prettifyToHtml(anyValue: any): { text: string; language: string } {
  // no possible object
  if(Array.isArray(anyValue)) {
    return { text: anyValue.join(', '), language: 'text' };

  }
  if (typeof anyValue !== 'string') {
    return { text: anyValue + '', language: 'javascript' };
  }
  try {
    const parsed = JSON.parse(anyValue);
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { text: JSON.stringify(parsed, null, 2).replace(/"([^"]+)":/g, '$1:'), language: 'javascript' };
    }
    return { text: anyValue + '', language: 'javascript' };
  } catch (e) {}

  return { text: anyValue, language: 'text' };
}

function fixImports(sourceFile: SourceFile) {
  const imports = sourceFile.getImportDeclarations();

  const usedNodeModules: string[] = [];
  const importsText = imports
    .map((i: Node) => {
      const text = i.getText();
      const foundNode = joinedPipe.exec(text);
      if (foundNode?.length) {
        usedNodeModules.push(foundNode.at(-1)!);
      }
      return text;
    })
    .join('\n');
  imports.forEach((i: ImportDeclaration) => i.remove());
  return { importsText, usedNodeModules };
}

function removeExports(sourceFile: SourceFile) {
  sourceFile.getExportedDeclarations().forEach((a: ExportedDeclarations[]) => {
    a.forEach((e: Node) => {
      removeExportStart(e);
    });
  });
  sourceFile.getExportDeclarations().forEach((e: ExportDeclaration) => removeExportStart(e));
  sourceFile.getExportAssignments().forEach((e: ExportAssignment) => removeExportStart(e));
  sourceFile.getVariableStatements().forEach((e: VariableStatement) => removeExportStart(e));
}


function surroundCode(importsText: string, sourceFileText: string, filePath: string, isIdea: boolean): string {
  return `
/**
 * GENERATED FILE FROM THE TYPESCRIPT-WORKSHEET EXTENSION
*/
${importsText}
import * as __fs from 'node:fs';
import os from 'node:os';
const dataFile: any[] = [];

async function __tsrun() {
try {

${sourceFileText}
} catch(error) {

  
}
}

__tsrun().then()

let ${DONE_FLAG} = "";
${DONE_FLAG} = "asdf";


function stringify(obj: any) {
  let cache: any = [];
  let str = JSON.stringify(obj, function(key, value) {
    if(typeof value === 'function') {
      const fn = __tsGetFn(value.toString()) ?? __tsGetArrowFn(value.toString());
      return fn;
    }
    if(value === undefined) {
      return '${UNDEFINED_FLAG}'
    }
    if (typeof value === "object" && value !== null) {
      if(value?.then) {
        return 'Promise';
      }
      if (cache.indexOf(value) !== -1) {
        // Circular reference found, discard key
        return;
      }
      // Store value in our collection
      cache.push(value);
      return value === undefined ? '${UNDEFINED_FLAG}' : value;
    }
    return value;
  });
  cache = null; // reset the cache
  return str;
}



function __tsGetFn(str: string) {
  const noSpaces = str.replaceAll(' ', '');
  const __tsFnWithArgs = /(function.*\\\(.*\\\))/
  const result = __tsFnWithArgs.exec(noSpaces);
  if(result?.length) {
    
    const fn = result.at(-1);
    const afterKey = fn.substring('function'.length);
    return 'function ' + afterKey;
  }
  return undefined;
}

function __tsGetArrowFn(str: string) {
  const noSpaces = str.replaceAll(' ', '');
  const __tsArrowWithArgs= /(\\\({0,1}[A-Za-z]{1}[A-Za-z0-9_,]*\\\){0,1})=>/;
const __tsArrorWithoutArgs = /\\\(\\\){1}=>/;
  const arrowWithArgsResult = __tsArrowWithArgs.exec(noSpaces);
  if(arrowWithArgsResult?.length) {
    const args =  arrowWithArgsResult.at(-1);
    return 'arrow fn(' + args + ')';
  }
  const arrowWithoutArgsResult = __tsArrorWithoutArgs.exec(noSpaces);
  if(arrowWithoutArgsResult?.length) {
    return 'arrow fn()';
  }
  return undefined;
}

function tryToStringify(value: any) {
    let res = '';
    try {
        switch(typeof value) {
            case 'object':
                res = stringify(value);
                break;
            case 'function':
                res = __tsGetFn(value.toString()) ?? __tsGetArrowFn(value.toString());
                break;
            case 'bigint':
                res = value?.toString();
                break;    
            default: 
                // isNaN
                if(value !== value) {
                  res = value?.toString();
                } else {
                  res = value === undefined ? '${UNDEFINED_FLAG}' : value;
                }
        }
    } catch(err: any) {
        return err?.message.startsWith('Convert') ? 'Non displayable' : err?.message;
    }
    return res?.length > ${MAX_LENGTH} ? res?.substring(0, ${MAX_LENGTH}) : res;
}

function __onError(error: any, dataValue: any) {
  const fixedError = error?.stack ?? error;
  const stringError = JSON.stringify(fixedError, Object.getOwnPropertyNames(fixedError));

  dataValue.type = 'error';
  dataValue.called = [error.message , stringError];
}
function save(hide: boolean, dataValue?: any) {
  if(hide) {
    return;
  }
  const isIpcCompatible = !${isIdea} && typeof Bun === 'undefined' && !globalThis?.Deno && !os.platform().startsWith('win');
  if(dataValue) {
    dataFile.push(dataValue);
  }

  if(isIpcCompatible) {
    process.send(dataValue);
  }

  if(!dataValue && !isIpcCompatible) {
    __fs.writeFileSync('${filePath}', JSON.stringify(dataFile));  
  }
}

function tsWorksheetWatch(data: {stringed: string, hide?: boolean, type: string, variable?: string, called: () => any, line: number }) {
  const dataValue = {...data, called: 'Failed Promise. Please use a .catch to display it'};
  let called: any;
  try {
      called = data.called();
  } catch(error) {
      __onError(error, dataValue);
      save(data.hide, dataValue);
      throw error;
  }

  if(data.type === 'throw') {
      __onError(called, dataValue);
      save(data.hide, dataValue);
      throw called;
  }

  if(called?.then) {
     data.called = called.then((r: any) => {
      dataValue.prefix = 'Resolved Promise: ';
        dataValue.called = tryToStringify(r);
         save(data.hide, dataValue);
         return r;
     }).catch((err: any) => {
      dataValue.prefix = 'Rejected Promise: ';
      dataValue.called = tryToStringify(err);
      dataValue.type = 'error';
      save(data.hide, dataValue);
      throw err;
     });
  } else {
      dataValue.called = tryToStringify(called);
      save(data.hide, dataValue);
  }

  return called;
}

function mylog(logFn: any, data: {type: string, called: any[], line: number }) {
    logFn(...data.called);
    data.called = data.called.map(entry => tryToStringify(entry)); 
    save(false, data);
}

if (globalThis?.Deno) {

  addEventListener("error", (event) => {
    event.preventDefault();
  });
  
  addEventListener("unhandledrejection", (e) => {
    e.preventDefault();
  });
  
  addEventListener("unload", () => {
    save(false);
  });
  }
  process?.on('uncaughtException', (error: Error) => {   
  });
  
  process?.on('unhandledRejection', () => {})
  
  process?.on('beforeExit', e => {
    if(typeof Bun !== 'undefined' && dataFile.some(e => e.type === 'error')) {
      process.exit(0);
    }
  })
  
  process?.on('exit', function() {
    save(false);
  });
      
    `;
}
