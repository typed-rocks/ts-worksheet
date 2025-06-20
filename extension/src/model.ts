import * as vscode from 'vscode';

export type HintData = {
  type: string;
  variable?: string;
  called: any;
  prefix?: string;
  hide: boolean;
  line: number;
  stringed: string;
};

export type RunStatus = 'running' | 'done' | 'terminated';
export type EnhancedDecorationOptions = vscode.DecorationOptions & {called: string};
export type WatcherType = { indexing: boolean; curIndex: number; arr: { replace: string; original: string }[] };
export type AllLogs = {
  logs: Record<number, EnhancedDecorationOptions>;
  expressions: Record<number, EnhancedDecorationOptions>;
  variables: Record<number, EnhancedDecorationOptions>;
  errors: Record<number, EnhancedDecorationOptions>;
};
export type SingleLineData = Record<number, { value: string[]; called: any[], type: string; }>;
export type DataResponse = {
  error?: { message: string; stack?: string };
  cli?: string;
  data: HintData[];
  time: number;
};
export type Config = {
  colors: { expression: string; log: string; error: string; variable: string };
  runAlways: boolean;
};
export type PossibleType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'function'
  | 'object'
  | 'array'
  | 'bigint'
  | 'symbol'
  | 'undefined'
  | 'null';
export const UNDEFINED_FLAG = '__TS_WORKSHEET_UNDEFINED__';

export type RuntimeType = { name: 'nodejs' | 'deno' | 'bun'; id: string, command: string, args: string[] };

export const DENO: RuntimeType = { name: 'deno', id: 'deno', command: 'deno', args: ['run', '-A', '--unstable-sloppy-imports'] };
export const BUN: RuntimeType = { name: 'bun', id: 'bun', command: 'bun', args: ['run'] };
export const NODEJS: RuntimeType = { name: 'nodejs', id: 'tsx', command: 'tsx', args: [] } ;

export const RUNTIMES = [DENO, BUN, NODEJS];

export const nodeModules = [
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'https',
  'net',
  'os',
  'path',
  'punycode',
  'querystring',
  'readline',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'zlib',
];