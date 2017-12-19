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

