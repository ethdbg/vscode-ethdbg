'use strict';
import * as vscode from 'vscode';

/** activation events must mirror package.json vscode-ext debugger schema */

const initialConfigurations = {
  version: '0.0.1',
  configurations: [
  {
    type: 'ether-debug',
    request: 'launch',
    program: '${file}',
    stopOnEntry: true,
  }
]}

export function getContractFile(config) {
  return vscode.window.showInputBox({
    placeHolder: "Enter contract name",
    value: "contract.sol"
  });
}

export function provideInitialConfigurations() {
  return [
    JSON.stringify(initialConfigurations, null, '\t')
  ].join('\n');
}
