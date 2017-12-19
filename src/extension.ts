import * as vscode from 'vscode';
import * as events from './activationEvents';


export function activate(context: vscode.ExtensionContext) {
  console.log('extension activated!');
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.ether-debug.provideInitialConfigurations',
      events.provideInitialConfigurations
    )
  );
  console.log('terminates during subscriptions.push');
}

export function deactivate() {
	// nothing to do
}

