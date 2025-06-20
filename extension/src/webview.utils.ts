import { Webview, WebviewView } from "vscode";

export function sendAvailableRuntimes(webview: WebviewView,cliStrings: string[]) {
  webview?.webview?.postMessage({
    command: 'runtimes',
    value: cliStrings,
  });
}