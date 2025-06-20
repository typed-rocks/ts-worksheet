import { runCli } from '../cli';
import fs from 'fs';
import { BUN, DENO, DataResponse, NODEJS, RuntimeType } from '../model';
import MyEmitter from '../super-emitter';
import { execSync } from 'child_process';

const refresh = process.env.REFRESH === 'true';
console.log('refreshing', refresh);
const files = ['testinput.spec.ts', 'reject.spec.ts'];
const runtimes = [NODEJS, BUN, DENO];
let curFileIndex = 0;
let curRuntimeIndex = 0;
function runFileWithRuntime(inputFile: string, runtime: RuntimeType) {
  console.log(`run ${inputFile} with ${runtime.name}`);
  const filePath = `${__dirname}/${inputFile}`;

  const wsJsonPath = `${__dirname}/.ws.data.json`;
  const emitter = new MyEmitter();
  let wsDataFile: DataResponse = {data: [], time: 0};
  emitter.onData(d => {
    wsDataFile.data.push(d);
  });
  emitter.onFile(data => {
    wsDataFile = data;
  });
  emitter.onExit(() => {
    const workingOutputFilePath = `${__dirname}/${runtime.name}_${inputFile}_working_output.json`;
    
    if (!fs.existsSync(workingOutputFilePath) || refresh) {
      fs.writeFileSync(workingOutputFilePath, JSON.stringify(wsDataFile));
    }
    const workingOutput = JSON.parse(fs.readFileSync(workingOutputFilePath, 'utf-8'));
    const successFul = JSON.stringify(wsDataFile.data) === JSON.stringify(workingOutput.data);

    if (!successFul) {
      console.error(`${inputFile} not successful for ${runtime.name}`);
      fs.writeFileSync(`${__dirname}/.ws.data.json`, JSON.stringify(wsDataFile));
      // execSync(`rm -rf ${__dirname}/../../node_modules`);
      execSync(`(cd  ${__dirname}/../.. && npm i)`);
      process.exit(1);
    }

    if(fs.existsSync(wsJsonPath)){
    fs.unlinkSync(wsJsonPath);
    }
    
    console.log('exit');
    const wsFilePath = `${__dirname}/.ws.${inputFile}.ts`;
    fs.unlinkSync(wsFilePath);

    //execSync(`rm -rf ${__dirname}/../../node_modules`);
    execSync(`(cd  ${__dirname}/../.. && npm i)`);
    
    if(curFileIndex === 1) {
      curFileIndex = 0;
      if(curRuntimeIndex === 2) {
        //execSync(`rm -rf ${__dirname}/../../node_modules`);
        execSync(`(cd  ${__dirname}/../.. && npm i)`);
        return;
      }
      curRuntimeIndex++;
    } else {
      curFileIndex++;
    }
    runFileWithRuntime(files[curFileIndex], runtimes[curRuntimeIndex]);
  });
  runCli(runtime, filePath, emitter, false, false);
}

runFileWithRuntime(files[0], runtimes[0]);
