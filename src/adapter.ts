// the link between VSCode and Ethereum Debug
import * as fs from 'fs';
import {join. dirname, sep} from 'path';
import {spawn} from 'child_process';
import {StreamParser} from './streamCatcher';
import {events} from './../ethdbg/index';

function absoluteFilename(root: string, filename: string): string {
  if (fs.existsSync(filename)) {
    return filename;
  }

  const fullPath= join(root, filename);
  if (fs.existsSync(fullPath)) {
    return fullPath;
  }

  return join(root, filename);
}

export class EthereumDebuggerConnection {
  public debug: boolean = false;
  private ethDebugger;
  public streamParser: StreamParser;
  private rootPath?: string;
  
  public onOutput: Function | null = null;
  public onError: Function | null = null;
  public onClose: Function | null = null;
  public onException: Function | null = null;

  constructor() {
    this.streamParser = new StreamParser();
  }
  
  logOutput(data: string) {
    if (typeof this.onOutput === 'function') {
      try {
        this.onOutput(data);
      } catch (err) {
        throw new Error(`Error in "onOutput" handler: ${err.message}`);
      }
    }
  }

  async launchRequest(cwd: string, args: string[] = [])
  : Promise<RequestResponse> {
    this.rootPath = cwd;
    if (this.debug) {
      console.log(`Platform: ${process.platform}`);
    }

    //const commandArgs = [].concat(args, [/* const opts */]);

    if (cwd && !fs.existsSync(cwd)) {
      this.logOutput(`Error: Folder ${cwd} not found`);
    }

    this.ethDebugger = spawn('./ethdbg.js',args);
    
    this.ethDebugger.on('error', (err) => {
      if (this.debug) {
        console.log('error: ', err);
      }
      this.logOutput(`Error`);
      this.logOutput( err );
      this.logOutput( `DUMP: spawn(${args})`);
    });

    this.streamParser.launch(this.ethDebugger.stdin, this.ethDebugger.stdout);

  }

}
