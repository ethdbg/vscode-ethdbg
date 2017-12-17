'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import * as events from './activationEvents';


export function activate(context: vscode.ExtensionContext) {

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.ether-debug.getContractFile', 
      events.getContractFile
    )
  );

	// register a configuration provider for 'ether' debug type
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(
      'ether-debug', new EtherConfigurationProvider()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.ether-debug.provideInitialConfigurations', 
      events.provideInitialConfigurations
    )
  );
}

export function deactivate() {
	// nothing to do
}

class EtherConfigurationProvider implements vscode.DebugConfigurationProvider {

  /**
   * Massage a debug configuration just before a debug session is being launched,
   * e.g. add all missing attributes to the debug configuration.
   */
  resolveDebugConfiguration(
    folder: WorkspaceFolder | undefined, 
    config: DebugConfiguration, token?: CancellationToken
  ) : ProviderResult<DebugConfiguration> {
    
    // if launch.json is missing or empty
    if (!config.type && !config.request && !config.name) {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'solidity' ) {
      config.type = 'ether';
      config.name = 'Launch';
      config.request = 'launch';
      config.program = '${file}';
      config.stopOnEntry = true;
      config.stopOnAllBreakpoints = true;
    }
  }

  if (!config.program) {
    return vscode.window.showInformationMessage("Cannot find a program to debug").then(_ => {
      return undefined;	// abort launch
    });
  }
  return config;
}
