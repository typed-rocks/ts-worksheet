import * as assert from "assert";
import path from "path";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
// import * as myExtension from '../../extension';

suite("Extension Test Suite", async () => {
  
  vscode.window.showInformationMessage("Start all tests.");
 
  test("Sample test", async function() {
    this.timeout(100000);
    const testinput = vscode.Uri.file('/Users/wrz/IdeaProjects/ts-show-test/testinput.ts');
    const document = await vscode.workspace.openTextDocument(testinput);
    const editor = await vscode.window.showTextDocument(document);

    await triggerSave();
    await sleep(100000);
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});

async function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function triggerSave() {
  // This will trigger the save action for the current file in VSCode
  await vscode.commands.executeCommand('workbench.action.files.save');
}