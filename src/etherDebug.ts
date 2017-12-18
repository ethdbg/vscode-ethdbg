/// <reference types="node" />

import {
	Logger, logger,
	DebugSession, LoggingDebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent, //Event,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint//, Variable
} from 'vscode-debugadapter';
import { EthereumDebuggerConnection } from './adapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { basename } from 'path';


/**
 * This interface describes the ether-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol).
 * The schema for these attributes lives in the package.json of the ether-debug extension.
 * The interface should always match this schema.
 */
export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	/** An absolute path to the program to debug. */
  program: string;
  /** workspace path **/
  root: string,
  /** List of includes **/
  inc?: string,
  /** when the debugger is started, it will gather all breakpoints in all files, instead of just one **/
  stopOnAllBreakpoints: boolean;
  /** arguments passed to the debugger library on launch **/
  execArgs: Array<string>;
	/** Automatically stop target after launch. If not specified, target does not stop. */
	stopOnEntry?: boolean;
	/** enable logging the Debug Adapter Protocol */
	trace?: boolean;
}

class EtherDebugSession extends LoggingDebugSession {

	// we don't support multiple threads, so we can use a hardcoded ID for the default thread
  private static THREAD_ID = 1;

  private _currentLine = 0;
  private get _currentLine() : number {
    return this._currentLine;
  }
  private set _currentLine(line: number) {
    this._currentLine = line;
  }

	private _variableHandles = new Handles<string>();
  private ethDebugger = new EthereumDebuggerConnection();
  private rootPath: string = '';

	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor() {
		super("ether-debug.txt");

		// this debugger uses zero-based lines and columns
		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);
	}

	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
  protected initializeRequest(
    response: DebugProtocol.InitializeResponse, 
    args: DebugProtocol.InitializeRequestArguments)
  : void {
    
    this.ethDebugger.onException = (res) => {
      const [ error ] = res.errors;
      this.sendEvent(new OutputEvent(`on exception ${error && error.near}`));
    }

    this.ethDebugger.onTermination = (res) => {
      this.sendEvent(new TerminatedEvent());
    };

    this.ethDebugger.onClose = (code) => {
      this.sendEvent(new TerminatedEvent());
    }
  
    this.ethDebugger.initializeRequest()
      .then(() => {
        // since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
        // we request them early by sending an 'initializeRequest' to the frontend.
        // The frontend will end the configuration sequence by calling 'configurationDone' request.
        this.sendEvent(new InitializedEvent())

        // build and return the capabilities of this debug adapter:
        response.body = response.body || {};

        // the adapter implements the configurationDoneRequest.
        response.body.supportsConfigurationDoneRequest = true;

        // make VS Code to use 'evaluate' when hovering over source
        response.body.supportsEvaluateForHovers = true;

        // make VS Code to show a 'step back' button
        response.body.supportsStepBack = false;

        response.body.supportsFunctionBreakpoints = false;

        this.sendResponse(response);     
      });
  }

  /**
   * launches the debugger
   */
  protected launchRequest(
    response: DebugProtocol.LaunchResponse, 
    args: LaunchRequestArguments)
  : void {

    this.rootPath = args.root;
    // don't worry about this for now TODO add directories for inclusion
    const inc = args.inc && args.inc.length ? args.inc.map(directory => `${directory}`) : [];
    const execArgs = [].concat(args.execArgs || [], inc);
    
    if (args.trace) {
      logger.setup(Logger.LogLevel.Verbose, /*logToFile=*/true);
    } else {
      logger.setup(Logger.LogLevel.Stop, false);
    }
   
    /// TODO: implement stop on entry in Eth debugger
    this.ethDebugger.launchRequest(args.program, execArgs)
      .then((res) => {
        if (args.stopOnEntry) {
          if (res.ln) {
            this._currentLine = res.ln - 1;
          }
          this.sendResponse(response);

          // stop on first line
          this.sendEvent(new StoppedEvent("entry", EtherDebugSession.THREAD_ID));
        } else {
          // continue until hit breakpoint
          this.continueRequest(
            <DebugProtocol.ContinueResponse>response, 
            { threadId: EtherDebugSession.THREAD_ID}
          );
        }
      });
   	this.sendResponse(response);
  }

  protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
    response.body = {
      threads: [
        new Thread(EtherDebugSession.THREAD_ID, "thread 1");
      ]
    };
  }
/**
 * Not Implemented
 * reverseContinue
 * stepBack
 * pause
 */

  protected reverseContinueRequest(
    response: DebugProtocol.ReverseContinueResponse,
    args: DebugProtocol.ReverseContinueArguments
  ) : void {
    this.sendEvent(new OutputEvent(`ERR>Reverse continue not implemented\n\n`));

    this.sendResponse(response);

    this._currentLine = 0;
    this.sendEvent(new StoppedEvent("entry", EtherDebugSession.THREAD_ID));
  }

  protected stepBackRequest(
    response: DebugProtocol.StepBackResponse,
    args: DebugProtocol.StepBackArguments
  ) : void {
    this.sendEvent(new OutputEvent(`ERR>Step back not implemented\n\n`));
    this.sendResponse(response);
    this._currentLine = 0;
    this.sendEvent(new StoppedEvent("entry", EtherDebugSession.THREAD_ID));
  }

  protected pauseRequest(
    response: DebugProtocol.PauseResponse,
    args: DebugProtocol.PauseArguments
  ) : void {
    this.sendEvent(new OutputEvent(`ERR>pause not implemented`));
    this.sendResponse(response);
    this.sendEvent(new StoppedEvent("breakpoint", EtherDebugSession.THREAD_ID));
  }
  
  
/** implemented **/

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {

		const path = <string>args.source.path;
		const clientLines = args.lines || [];

		// send back the actual breakpoint positions
		response.body = {
			breakpoints: actualBreakpoints
		};
		this.sendResponse(response);
	}


	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {

		const startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
		const maxLevels = typeof args.levels === 'number' ? args.levels : 1000;
		const endFrame = startFrame + maxLevels;

		response.body = {
			stackFrames: stk.frames.map(f => new StackFrame(f.index, f.name, this.createSource(f.file), this.convertDebuggerLineToClient(f.line))),
			totalFrames: stk.count
		};
		this.sendResponse(response);
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {

		const frameReference = args.frameId;
		const scopes = new Array<Scope>();
		scopes.push(new Scope("Local", this._variableHandles.create("local_" + frameReference), false));
		scopes.push(new Scope("Global", this._variableHandles.create("global_" + frameReference), true));

		response.body = {
			scopes: scopes
		};
		this.sendResponse(response);
	}

	protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {

		// TODO This just needs to pull the variable info from a context object.

		const variables = new Array<DebugProtocol.Variable>();

		response.body = {
			variables: variables
		};
		this.sendResponse(response);
	}

	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		this.sendResponse(response);
	}


	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this.sendResponse(response);
	}

	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {

		let reply: string | undefined = undefined;

		response.body = {
			result: reply ? reply : `evaluate(context: '${args.context}', '${args.expression}')`,
			variablesReference: 0
		};
		this.sendResponse(response);
	}

	//---- helpers

	private createSource(filePath: string): Source {
		return new Source(basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'ether-adapter-data');
	}
}

DebugSession.run(EtherDebugSession);
