// the link between VSCode and Ethereum Debug
import * as fs from 'fs';
import {join} from 'path';
import {spawn} from 'child_process';
import {StreamParser} from './streamParser';
import {events} from './../ethdbg/index';

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
    this.streamParser.request(events.clearAllBreakpoints, null);
  }
  
  continue() {
    this.streamParser.request(events.continue, null);
  }

  stepIn() {
    this.streamParser.request(events.stepInto, null);
  }

  stepOut() {
    this.streamParser.request(events.stepOut, null);
  }
  
  stepOver() {
    this.streamParser.request(events.stepOver, null);
  }

  // needs to be async TODO
  restart() {
    this.streamParser.request(events.restart, null);
  }

  // needs to be async TODO
  getVariableList() {
    this.streamParser.request(events.getVarList, null);
  }

  destroy() {
    if (this.ethDebugger) {
      this.streamParser.destroy();
      this.ethDebugger.kill();
      this.ethDebugger = null;
    }
  }

  absoluteFilename(root: string, filename: string): string {
    // if it's already absolute then return
    if (fs.existsSync(filename)) {
      return filename;
    }
    //otherwise assume it's a relative filename
    const fullPath = join(root, filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    // xxx: we might want to resolve module names later on
    // using this.resolveFilename, for now we just return the joined path
    return join(root, filename);
  }

  relativeFilename(root: string, filename: string): string {
    // If already relative to root
    if (fs.existsSync(join(root, filename))) {
      return filename;
    }
    // Try to create relative filename
    // ensure trailing separator in root path eg. /foo/
    const relName = filename.replace(root, '').replace(/^[\/|\\]/, '');
    if (fs.existsSync(join(root, relName))) {
      return relName;
    }

    // We might need to add more cases
    return filename;

  }
}
