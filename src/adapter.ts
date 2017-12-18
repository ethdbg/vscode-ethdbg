// the link between VSCode and Ethereum Debug
import * as fs from 'fs';
import {join. dirname, sep} from 'path';
import {spawn} from 'child_process';
import {StreamParser} from './streamCatcher';
import {events} from './../ethdbg/index';
// should handle file paths

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
  public onTermination: Function | null = null;

  constructor() {
    this.streamParser = new StreamParser();
  }

  async initializeRequest() {}
  
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
  : Promise<any> {
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

    this.ethDebugger.on('close', (code) => {
      if (this.streamParser.ready) {
        this.logOutput(`Debugger connection closed`);
      } else {
        this.logOutput(`Could not connect to debugger, connection closed`);
      }

      if (typeof this.onClose === 'function') {
        try {
          this.onClose(code)
        } catch (err) {
          throw new Error(`Error in "onClose" handler: ${err.message}`);
        }
      }
    });
    await this.streamParser.isReady();
    return;
  }
  
  async request(ev, data): Promise<any> {
    await this.streamParser.isReady();
    this.streamParser.request(ev, data);
  }

  /** TODO might have to make all these move to async **/
  /** all these need to be async, and get a response from the dbger **/
  toggleBreakpoint(ln: number, filepath: string) {
    this.streamParser.request(events.toggleBreakpoint, filepath);
  }

  clearAllBreakpoints() {
    this.streamParser.request(events.clearAllBreakpoints);
  }
  
  continue() {
    this.streamParser.request(events.continue);
  }

  stepIn() {
    this.streamParser.request(events.stepIn);
  }

  stepOut() {
    this.streamParser.request(events.stepOut);
  }
  
  // needs to be async TODO
  restart() {
    this.streamParser.request(events.restart);
  }

  // needs to be async TODO
  getVariableList() {
    this.streamParser.request(events.getVarList);
  }

  destroy() {
    if (this.ethDebugger) {
      this.streamParser.destroy();
      this.ethDebugger.kill();
      this.ethDebugger = null;
    }
  }
}
