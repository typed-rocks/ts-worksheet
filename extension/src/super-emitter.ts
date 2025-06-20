import EventEmitter from "stream";
import { DataResponse, HintData } from "./model";
import { ChildProcess } from "child_process";

export default class MyEmitter extends EventEmitter {

  kill() {
    this.emit('kill');
  }

  stop() {
    this.emit('stop');
  }

  exit(time: number) {
    this.emit('exit', time);
  }

  dataFile(data: DataResponse) {
    this.emit('file', data);
  }

  data(data: HintData) {
    this.emit('data', data);
  }

  onFile(cb: (file: DataResponse) => any) {
    this.on('file', cb);
  }

  onData(cb: (data: HintData) => any) {
    this.on('data', cb);
  }
  onExit(cb: (time: number) => any) {
    this.on('exit', cb);
  }

  onStop(cb: () => any) {
    this.on('stop', cb);
  }

  onKill(cb: () => any) {
    this.on('kill', cb);
  }
}