import { createWatchFile, stringifyHintData } from './agnostic';
import path from 'path';
import * as fs from 'fs';
import os from 'os';
import { ChildProcess, exec, execSync, spawn } from 'child_process';
import { BUN, DENO, HintData, NODEJS, RuntimeType, SingleLineData } from './model';

import which from 'which';
import MyEmitter from './super-emitter';

const CLI = process.env.CLI as string;
const FILE = process.env.FILE as string;
const SHOW_ORDER = process.env.SHOW_ORDER as string;

export function runCli(runtime: RuntimeType, filePath: string, emit: MyEmitter, isIdea: boolean, removeWsFile = true) {
  const dir = path.parse(filePath).dir;
  process.chdir(dir);
  const dataPath = path.join(dir, '.ws.data.json');

  if (!which.sync(runtime.id, { nothrow: true })) {
    if (runtime.name === 'nodejs' && !isIdea) {
      emit.dataFile({ data: [], error: { message: 'runtimeMissing' }, cli: runtime.id, time: 0 });
    } else {
      fs.writeFileSync(
        dataPath,
        JSON.stringify({ error: { message: `runtimeMissing: ${runtime.id}` }, cli: runtime.id }),
      );
    }
    return;
  }

  const { wsFilePath, readyFile, usedNodeModules } = createWatchFile(filePath, isIdea);
  if (runtime.id === 'deno' && usedNodeModules.length) {
    return { usedNodeModules };
  }
  fs.writeFileSync(wsFilePath, readyFile);

  removeFile(dataPath, removeWsFile);

  const isWindows = os.platform().startsWith('win');
  const killAll = (cp: ChildProcess) => {
    cp.kill();
    cp.removeAllListeners();
    cp.disconnect();
    emit.stop();
  };
  const startTime = new Date().getTime();
  try {
    if (isIdea) {
      const command = [runtime.command, ...runtime.args, `"${wsFilePath}"`].join(' ');
      execSync(command);
      return { success: true, time: new Date().getTime() - startTime };
    }
    if (isWindows) {
      const command = [runtime.command, ...runtime.args, `"${wsFilePath}"`].join(' ');
      const executing = exec(command);
      emit.onKill(() => killAll(executing));
      executing.on('exit', () => {
        const time = new Date().getTime() - startTime;
        handleExitResult(dataPath, emit, time, removeWsFile);
        emit.exit(time);
        removeFile(wsFilePath, removeWsFile);
      });

      return;
    }

    const spawned = spawn(runtime.command, [...runtime.args, wsFilePath], {
      stdio: [0, 1, 2, 'ipc'],
    });
    spawned.on('message', (data: HintData) => emit.data(data));
    emit.onKill(() => {
      killAll(spawned);
      removeFile(wsFilePath, removeWsFile);
    });
    spawned.on('exit', () => {
      const time = new Date().getTime() - startTime;
      if (runtime.name !== 'nodejs' && !isIdea) {
        handleExitResult(dataPath, emit, time, removeWsFile);
      }
      emit.exit(time);

      removeFile(wsFilePath, removeWsFile);
    });
  } catch (err: any) {
    const time = new Date().getTime() - startTime;
    const errData = { data: [], error: { message: err.message ?? err.toString(), stack: err.stack }, time };
    if (!isIdea) {
      emit.dataFile(errData);
    } else {
      fs.writeFileSync(dataPath, JSON.stringify(errData));
      return { success: false, time };
    }
  }
}

function handleExitResult(dataPath: string, emit: MyEmitter, time: number, removeWsFile: boolean) {
  if (fs.existsSync(dataPath)) {
    const result = JSON.parse(fs.readFileSync(dataPath).toString('utf-8'));
    emit.dataFile({ data: result, time });
    removeFile(dataPath, removeWsFile);
  }
}

function removeFile(wsFilePath: string, removeWsFile: boolean) {
  if (removeWsFile && fs.existsSync(wsFilePath)) {
    fs.unlinkSync(wsFilePath);
  }
}

function createHints(response: HintData[], max: number, showOrder: boolean): SingleLineData {
  const merged: SingleLineData = {};
  response.forEach((data, i) => {
    const { line, type } = data;
    const { withVariable, called } = stringifyHintData(data);
    const value = showOrder ? `(${i}) ${withVariable}` : withVariable;

    if (!merged[line]) {
      merged[line] = { called: [], value: [], type: type };
    }

    merged[line].value.push(value);
    merged[line].called.push(called);    
  });
  return merged;
}

if (CLI) {
  const determinedRuntime = [NODEJS, DENO, BUN].find((rt) => rt.id === CLI)!;
  const emitter = new MyEmitter();
  const { dir, base } = path.parse(FILE);
  const wsFile = path.join(dir, `.ws.${base}.ts`);
  const dataPath = path.join(dir, '.ws.data.json');
  const r = runCli(determinedRuntime, FILE, emitter, true, true);

  if (fs.existsSync(wsFile)) {
    fs.unlinkSync(wsFile);
  }

  if (r?.usedNodeModules) {
    const err = `You have imports which uses a node module: ${r.usedNodeModules.join(', ')} Please prefix them with 'node:' and run it again.`;
    fs.writeFileSync(dataPath, JSON.stringify({ error: { message: err } }));
  }

  if (r?.success) {
    const readWrite = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const singleLineData = createHints(readWrite, Infinity, !!SHOW_ORDER);
    fs.writeFileSync(dataPath, JSON.stringify({ data: singleLineData, time: r.time }));
  }

  console.log('done');
}
