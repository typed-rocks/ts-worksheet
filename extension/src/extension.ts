import * as vscode from 'vscode';
import * as fsSync from 'fs';

import path from 'path';
import { ISSUE_URL, START_FLAG, START_FLAG_WITH_VARIABLES } from './constants';
import {
  AllLogs,
  BUN,
  Config,
  DENO,
  DataResponse,
  EnhancedDecorationOptions,
  NODEJS,
  RUNTIMES,
  RunStatus,
  RuntimeType,
  SingleLineData,
  nodeModules,
} from './model';
import { runCli } from './cli';
import { execSync } from 'child_process';
import which from 'which';
import { prettifyToHtml, stringifyHintData } from './agnostic';
import MyEmitter from './super-emitter';
import { sendAvailableRuntimes } from './webview.utils';

const createDecorationType = (color: string) =>
  vscode.window.createTextEditorDecorationType({
    after: { color, margin: '0 0 0 10px' },
    rangeBehavior: vscode.DecorationRangeBehavior.OpenOpen,
  });

const filesWhichHaveWs: Set<string> = new Set();
let config = getConfig();
let decorationTypeExpression = createDecorationType(config.colors.expression);

const startedFromCommandState: {running: boolean, withVariables: boolean} = {
  running: false,
  withVariables: false 
};


let decorationTypeLog = createDecorationType(config.colors.log);
let decorationTypeVariable = createDecorationType(config.colors.variable);
let decorationTypeError = createDecorationType(config.colors.error);

let startHighlightDecoration = vscode.window.createTextEditorDecorationType({
  color: config.colors.log, // Change this color to your preference
});

let withVariablesHighlightDecoration = vscode.window.createTextEditorDecorationType({
  color: config.colors.variable, // Change this color to your preference
});

function highlightFirstLine(editor?: vscode.TextEditor) {
  if (!editor) {
    return;
  }

  if(startedFromCommandState.running) {
    editor.setDecorations(startHighlightDecoration, []);
    editor.setDecorations(withVariablesHighlightDecoration, []);
    return;
  }
  const text = editor.document.getText();
  const enabled = enableState(editor.document);
  const startRange = new vscode.Range(
    new vscode.Position(0, 0),
    new vscode.Position(0, text.indexOf(START_FLAG) + START_FLAG.length),
  );
  const withVariablesRange = new vscode.Range(
    new vscode.Position(0, START_FLAG.length),
    new vscode.Position(0, text.indexOf(START_FLAG_WITH_VARIABLES) + START_FLAG_WITH_VARIABLES.length),
  );

  const fileName = editor.document.fileName;
  const alreadySet = filesWhichHaveWs.has(fileName);
  if (enabled.highlightVariables) {
    editor.setDecorations(startHighlightDecoration, [{ range: startRange }]);
    editor.setDecorations(withVariablesHighlightDecoration, [{ range: withVariablesRange }]);
    filesWhichHaveWs.add(fileName);
  } else if (enabled.enabled && enabled.highlight) {
    filesWhichHaveWs.add(fileName);
    editor.setDecorations(startHighlightDecoration, [{ range: startRange }]);
    editor.setDecorations(withVariablesHighlightDecoration, []);
  } else if (alreadySet) {
    editor.setDecorations(startHighlightDecoration, []);
    editor.setDecorations(withVariablesHighlightDecoration, []);
    filesWhichHaveWs.delete(fileName);
  }
}

function enableState(document: vscode.TextDocument) {
  if(startedFromCommandState.running) {
    return {
      enabled: true,
      hasVariables: startedFromCommandState.withVariables,
      highlight: false,
      highlightVariables: false
    };
  }
  const firstLineCleaned = document.lineAt(0).text.replaceAll(' ', '');

  const isFirstLineComment = firstLineCleaned.startsWith('//');
  const hasStart = firstLineCleaned.startsWith(`//${START_FLAG}`);
  const hasVariables = firstLineCleaned.startsWith(`//${START_FLAG_WITH_VARIABLES}`);

  const showVariables = hasVariables || !hasStart && startedFromCommandState.withVariables;
  return {
    enabled: isFirstLineComment && (hasStart || hasVariables),
    hasVariables: showVariables,
    highlight: hasStart,
    highlightVariables: hasVariables
  };
}

function getLengthOrUndefined(document?: vscode.TextDocument): number | undefined {
  if (!document) {
    return undefined;
  }
  const filePath = document?.fileName;
  if (!filePath || !filePathToFileMap.has(filePath)) {
    return undefined;
  }

  const withVariables = enableState(document).hasVariables;
  const data = filePathToFileMap.get(filePath)?.response.data;
  return withVariables ? data?.length : data?.filter((e) => e.type !== 'variable').length;
}

function getDataResponseForFilePathOrNull(filePath?: string): DataResponse | undefined {
  if (!filePath) {
    return undefined;
  }
  return filePathToFileMap.has(filePath) ? filePathToFileMap.get(filePath)?.response : undefined;
}

function sendCurrentLength(document?: vscode.TextDocument) {
  const value = getLengthOrUndefined(document) ?? 0;

  webview?.webview?.postMessage({
    command: 'ran',
    value,
  });
}

function updateRunstatus(value: RunStatus, curFilePath: string | undefined) {
  if (value !== 'running') {
    emitter.removeAllListeners();
    startedFromCommandState.running = false;
  }
  const wasRunningNowTerminated = value === 'terminated' && runStatus === 'running';
  if (wasRunningNowTerminated) {
    const fileName = curFilePath ? path.basename(curFilePath) : 'the current file';
    vscode.window.showInformationMessage(`Typescript Worksheet stopped running ${fileName}.`);
  }
  runStatus = value;
  sendRunStatus(runStatus);
}

function sendRunStatus(value: RunStatus) {
  webview?.webview?.postMessage({
    command: 'status',
    value,
  });
}

let webview: vscode.WebviewView;
let showOrder = false;
let runtime: RuntimeType = NODEJS;

let runStatus: RunStatus = 'done';
const emitter = new MyEmitter();

function isPositionAtEndOfLine(position: vscode.Position) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return false;
  }
  // Get the TextLine object for the given line
  const line = editor.document.lineAt(position.line);

  // Check if the position's character offset is at the end of the line
  return position.character >= line.text.length;
}

const filePathToFileMap = new Map<string, { response: DataResponse; hints: SingleLineData; lines: Set<number> }>();
export function activate(context: vscode.ExtensionContext) {
  const hoverDisposable = vscode.languages.registerHoverProvider('*', {
    provideHover(document, position, token) {
      if (!filePathToFileMap.has(document.fileName)) {
        return;
      }
      if (!isPositionAtEndOfLine(position)) {
        return;
      }
      const allHints = filePathToFileMap.get(document.fileName)!.hints;

      const hoversArray = allHints[position.line + 1]?.called;
      if (!hoversArray?.length) {
        return undefined;
      }
      const copyButton = `[Copy Value](command:ts-worksheet.copyToClipboard?${encodeURIComponent(JSON.stringify([document.fileName, position.line + 1]))})`;
      const content = new vscode.MarkdownString();
      content.appendMarkdown(copyButton);
      hoversArray.forEach((hoversInfo) => {
        const { text, language } = prettifyToHtml(hoversInfo);
        const lines = text.split('\\n').map(l => !l.trim().length ? ' ' : l);
        lines.forEach(line => content.appendCodeblock(line, language));
      });
      content.isTrusted = true;
      content.supportHtml = true;
      return new vscode.Hover(content);
    },
  });

  const runCommand = vscode.commands.registerCommand('ts-worksheet.run', () => {
    startedFromCommandState.running = true;
    startedFromCommandState.withVariables = true;
    emitter.kill();
    emitter.stop();
    runOnSave();
  });

  const runWithVariablesCommand = vscode.commands.registerCommand('ts-worksheet.run-no-variables', () => {
    startedFromCommandState.running = true;
    startedFromCommandState.withVariables = false;
    emitter.kill();
    emitter.stop();
    runOnSave();
  });

  // Register a command that gets executed when the hover is clicked
  const disposableCommand = vscode.commands.registerCommand('ts-worksheet.copyToClipboard', function (filename, line) {
    // Function to run when the command is executed
    if (filePathToFileMap.has(filename)) {
      const text = filePathToFileMap
        .get(filename)
        ?.hints[line].called.map((el) => prettifyToHtml(el).text)
        .join('');
      if (text) {
        vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage('Copied value to clipboard');
      }
    }
  });

  context.subscriptions.push(hoverDisposable, disposableCommand);

  vscode.window.onDidChangeActiveTextEditor((newEditor) => {
    emitter.kill();
    emitter.stop();
    if (newEditor) {
      highlightFirstLine(newEditor);
      
      const result = getDataResponseForFilePathOrNull(newEditor.document.fileName);
      if (result) {
        setDecorationsFromRunResult(result, result.data.length, showOrder, newEditor);
      }
      sendCurrentLength(newEditor.document);
    }
  });

  const myView = vscode.window.registerWebviewViewProvider('ts-view', {
    resolveWebviewView(webviewView) {
      webview = webviewView;
      webview.webview.options = {
        enableScripts: true,
      };

      webview.webview.html = fsSync.readFileSync(context.asAbsolutePath('timetravel-view.html'), 'utf-8');
      const toCheck = RUNTIMES.filter((rt) => which.sync(rt.id, { nothrow: true })).map((e) => e.name);
      sendAvailableRuntimes(webview, toCheck);
      webview.onDidChangeVisibility(() => sendCurrentLength(vscode.window.activeTextEditor?.document));
      sendRunStatus(runStatus);
      sendCurrentLength(vscode.window.activeTextEditor?.document);

      webview.webview.onDidReceiveMessage((message) => {
        const activeEditor = vscode.window.activeTextEditor;
        const data = getDataResponseForFilePathOrNull(activeEditor?.document.fileName);

        switch (message.command) {
          case 'stopRun':
            emitter.kill();
            updateRunstatus('terminated', activeEditor?.document.fileName);
            break;
          case 'updateRuntime':
            runtime = getRuntimeFromName(message.value);
            return;
          case 'showOrder':
            showOrder = message.checked;
            if (!data) {
              vscode.window.showErrorMessage('Please first save the current editor');
              return;
            }
            setDecorationsFromRunResult(data, +message.value, showOrder, activeEditor);
            break;
          case 'sliderValue':
            if (!data) {
              vscode.window.showErrorMessage('Please first save the current editor');
              return;
            }
            setDecorationsFromRunResult(data, +message.value, showOrder, activeEditor);
        }
      });
    },
  });

  context.subscriptions.push(myView);

  const didChangeDocument = vscode.workspace.onDidChangeTextDocument((change) => {
    const activeEditor = vscode.window.activeTextEditor;
    highlightFirstLine(activeEditor);
    if (activeEditor && enableState(activeEditor?.document).enabled) {
      resetDecorations(activeEditor);
      emitter.kill();
      emitter.stop();
    }
  });
  const didChangeConfig = vscode.workspace.onDidChangeConfiguration(async () => {
    config = getConfig();
    decorationTypeExpression = createDecorationType(config.colors.expression);
    decorationTypeLog = createDecorationType(config.colors.log);
    decorationTypeError = createDecorationType(config.colors.error);
    decorationTypeVariable = createDecorationType(config.colors.variable);

    const editor = vscode.window.activeTextEditor;
    editor?.setDecorations(startHighlightDecoration, []);
    editor?.setDecorations(withVariablesHighlightDecoration, []);
    startHighlightDecoration = vscode.window.createTextEditorDecorationType({
      color: config.colors.log, // Change this color to your preference
    });

    withVariablesHighlightDecoration = vscode.window.createTextEditorDecorationType({
      color: config.colors.variable, // Change this color to your preference
    });
    highlightFirstLine(editor);
  });
  context.subscriptions.push(didChangeConfig, didChangeDocument);

  const disposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
  runOnSave();
  });

  function runOnSave() {
    const activeEditor = vscode.window.activeTextEditor;

    if (!activeEditor) {
      return;
    }

    highlightFirstLine(activeEditor);

    const filePath = activeEditor.document.uri.fsPath;
    resetDecorations(activeEditor);
    const isReady = checkPrerequisites(activeEditor);
    if (!isReady) {
      startedFromCommandState.running = false;
      return;
    }
    updateRunstatus('running', activeEditor.document.fileName);
    runLoop(runtime, filePath, activeEditor);
  }

  function checkPrerequisites(activeEditor: vscode.TextEditor) {
    const document = activeEditor.document;
    if (!enableState(document).enabled) {
      resetDecorations(activeEditor);
      return false;
    }

    if (runStatus === 'running') {
      vscode.window.showWarningMessage(
        'TypeScript Worksheet is already running. Please wait for your file to finish or stop it by closing the tab.',
      );
      return false;
    }

    const hasMultiAwait = /await\s+await/.test(document.getText());
    if (hasMultiAwait) {
      resetDecorations(activeEditor);
      vscode.window.showWarningMessage(
        `Not running Typescript Worksheet because it does not support multiple chained 'await' keywords `,
      );
      return false;
    }
    if (hasErrors(document)) {
      resetDecorations(activeEditor);
      vscode.window.showWarningMessage('Not running Typescript Worksheet because there are errors in the file');
      return false;
    }
    if (!which.sync('tsx', { nothrow: true })) {
      vscode.window.showInformationMessage('TSX is being installed.').then();
      execSync('npm i -g tsx@4.7.0');
      vscode.window.showInformationMessage('TSX installed successfully.').then();
    }
    return true;
  }

  function parseData(result: DataResponse, activeEditor: vscode.TextEditor) {
    const lines = new Set(result.data.map((r) => r.line));
    filePathToFileMap.set(activeEditor.document.fileName, { response: result, hints: [], lines });
    setDecorationsFromRunResult(result, Infinity, showOrder, activeEditor);
    sendCurrentLength(activeEditor.document);
  }

  function handleFileResult(result: DataResponse, activeEditor: vscode.TextEditor) {
    updateRunstatus('done', activeEditor.document.fileName);
    if (!result.error) {
      parseData(result, activeEditor);
      vscode.window.showInformationMessage(`TypeScript Worksheet ran with ${runtime.name} in ${result.time}ms!`).then();
      return false;
    } else {
      if (result.error.message === 'runtimeMissing') {
        vscode.window.showErrorMessage(
          `The executable ${result.cli} was not found. Make sure it is available in the PATH variable in the terminal. Please restart your vscode after you've made sure it's available.`,
        );
      } else {
        const noColors = result.error.message || '';
        const hasNodemodules = nodeModules.filter((m) => noColors.includes(`Relative import path "${m}"`)).join(', ');

        if (hasNodemodules) {
          showOnError(
            `One of your dependent files has the non prefixed node module imports: ${hasNodemodules}. Please prefix them with 'node:'`,
          );
          return false;
        }
        showOnError('Error in the cli: ' + noColors);
        return false;
      }
    }
  }

  function runLoop(runtime: RuntimeType, filePath: string, activeEditor: vscode.TextEditor) {
    try {
      emitter.onData((data) => {
        const existingData = filePathToFileMap.get(filePath)?.response.data;
        const newData = existingData ? [...existingData, data] : [data];
        return parseData({ data: newData, time: 0 }, activeEditor);
      });
      emitter.onFile((result: DataResponse) => handleFileResult(result, activeEditor));
      emitter.onExit((time) => {
        vscode.window.showInformationMessage(`TypeScript Worksheet ran with ${runtime.name} in ${time}ms!`).then();
        return updateRunstatus('done', filePath);
      });
      emitter.onStop(() => {
        return updateRunstatus('terminated', filePath);
      });
      const r = runCli(runtime, filePath, emitter, false);
      if (typeof r === 'object' && r.usedNodeModules) {
        vscode.window.showErrorMessage(
          `You have imports which uses a node module: ${r.usedNodeModules.join(', ')} Please prefix them with 'node:' and run it again.`,
        );
        updateRunstatus('done', filePath);
        return;
      }
    } catch (err: unknown) {
      showOnError(err);
      return;
    }
  }

  context.subscriptions.push(disposable);
}

function getRuntimeFromName(name: 'nodejs' | 'bun' | 'deno'): RuntimeType {
  switch (name) {
    case 'bun':
      return BUN;
    case 'deno':
      return DENO;
    case 'nodejs':
      return NODEJS;
  }
}

function resetDecorations(activeEditor?: vscode.TextEditor) {
  if (activeEditor && filePathToFileMap.has(activeEditor.document.fileName)) {
    activeEditor.setDecorations(decorationTypeExpression, []);
    activeEditor.setDecorations(decorationTypeLog, []);
    activeEditor.setDecorations(decorationTypeVariable, []);
    activeEditor.setDecorations(decorationTypeError, []);
    filePathToFileMap.delete(activeEditor.document.fileName);
    sendCurrentLength(activeEditor.document);
  }
}

function createHints(
  document: vscode.TextDocument,
  response: DataResponse,
  max: number,
  showOrder: boolean,
): { allLogs: AllLogs; merged: SingleLineData } {
  const withVariables = enableState(document).hasVariables;

  const allLineHints = response.data;
  const text = document.getText();
  const allLogs: AllLogs = {
    logs: [],
    expressions: [],
    variables: [],
    errors: [],
  };
  const anySingleLineChecks = text.replaceAll(' ', '').includes('//?');
  const shouldNotRunAtAll = !anySingleLineChecks && !config.runAlways;
  const shouldRunForAll = !anySingleLineChecks && config.runAlways;
  if (shouldNotRunAtAll) {
    vscode.window
      .showInformationMessage(
        `TypeScript Worksheet did not run because 'run always' was set to false and no '//?' is enabled !`,
      )
      .then();
    return { allLogs, merged: {} };
  }

  const merged: SingleLineData = {};
  let count = 0;
  allLineHints
    .filter((entry) => !entry.hide)
    .filter((entry) => {
      const line = entry.line;
      const isVariableAndVariablesDisabled = entry.type === 'variable' && !withVariables;
      const isMoreOrEqualMax = count >= max;
      if (isVariableAndVariablesDisabled || isMoreOrEqualMax) {
        return false;
      }
      count++;
      if (shouldRunForAll) {
        return true;
      }
      const curLineText = document.lineAt(line - 1);
      return curLineText.text.replaceAll(' ', '').endsWith('//?');
    })
    .forEach((data, i) => {
      const { line, type } = data;
      const { withVariable, called } = stringifyHintData(data);
      const value = showOrder ? `(${i}) ${withVariable}` : withVariable;

      if (!merged[line]) {
        merged[line] = { called: [], value: [], type: type };
      }

      merged[line].value.push(value);
      merged[line].called.push(called);

      const stringValue = merged[line].value.join(', ');
      const callStringValue = merged[line].called.join(', ');

      const range = getAppendToLineRange(document, line);
      const decoration = {
        called: callStringValue,
        range,
        renderOptions: { after: { contentText: stringValue } },
      };
      if (type === 'log') {
        allLogs.logs[line] = decoration;
      } else if (type === 'expression') {
        allLogs.expressions[line] = decoration;
      } else if (type === 'variable' && withVariables) {
        allLogs.variables[line] = decoration;
      } else if (type === 'error') {
        allLogs.errors[line] = decoration;
      }
    });
  return { allLogs, merged };
}

async function showOnError(err: unknown) {
  updateRunstatus('done', undefined);
  const createIssue = 'Create an Issue';
  const action = await vscode.window.showErrorMessage(
    `
	ts-worksheet: An Error happend during the running of the worksheet. 
	If you think there is something wrong with the plugin, please file an issue: : ${err}`,
    createIssue,
  );
  if (action === createIssue) {
    vscode.env.openExternal(vscode.Uri.parse(ISSUE_URL));
  }
}

function hasErrors(document: vscode.TextDocument) {
  const diagnostics = vscode.languages.getDiagnostics(document.uri);
  return diagnostics.some((diagnostic) => diagnostic.severity === vscode.DiagnosticSeverity.Error && diagnostic.source !== 'eslint');
}

function setDecorationsFromRunResult(
  result: DataResponse,
  max: number,
  showOrder: boolean,
  editor?: vscode.TextEditor,
) {
  if (editor) {
    const { allLogs: decors, merged } = createHints(editor.document, result, max, showOrder);

    const expressions: EnhancedDecorationOptions[] = Object.values(decors.expressions).flatMap((t) => t);
    const variables: EnhancedDecorationOptions[] = Object.values(decors.variables).flatMap((t) => t);
    const errors: EnhancedDecorationOptions[] = Object.values(decors.errors).flatMap((t) => t);
    const logs: EnhancedDecorationOptions[] = Object.values(decors.logs).flatMap((t) => t);
    filePathToFileMap.get(editor.document.fileName)!.hints = merged;

    editor.setDecorations(decorationTypeExpression, expressions);
    editor.setDecorations(decorationTypeLog, logs);
    editor.setDecorations(decorationTypeVariable, variables);
    editor.setDecorations(decorationTypeError, errors);
  }
}

function getAppendToLineRange(document: vscode.TextDocument, line: number): vscode.Range {
  const curLineText = document.lineAt(line - 1);
  const startColNewHint = Math.max(curLineText.text.length, 0);
  const endposition = new vscode.Position(curLineText.lineNumber, startColNewHint);
  return new vscode.Range(endposition, endposition);
}

function getConfig(): Config {
  const config = vscode.workspace.getConfiguration('ts-worksheet');
  return {
    colors: {
      log: config.get('colors.log')!,
      expression: config.get('colors.expression')!,
      variable: config.get('colors.variable')!,
      error: config.get('colors.error')!,
    },
    runAlways: config.get('run.always')!,
  };
}

export function deactivate() {}
