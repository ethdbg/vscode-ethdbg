/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

/**
 * @file
 * Modified under the MIT.
 * Most things *should* work just about correctly, we just need to add tie-ins to the runtime.
 */

import { readFileSync } from 'fs';
import { EventEmitter } from 'events';
/// <reference path="./../ethdbg/lib/debugger.d.ts" />
import Debugger from './../ethdbg/';

export interface etherBreakpoint {
	id: number;
	line: number;
	verified: boolean;
}

/**
 * A ether runtime with minimal debugger functionality.
 */
export class EtherRuntime extends EventEmitter {

	// the initial (and one and only) file we are 'debugging'
	private _sourceFile: string;
	public get sourceFile() {
		return this._sourceFile;
	}

	// the contents (= lines) of the one and only file
	private _sourceLines: string[];
	private _debugger: Debugger;

	// This is the next line that will be 'executed'
	private _currentLine = 0;

	// maps from sourceFile to array of ether breakpoints
	private _breakPoints = new Map<string, etherBreakpoint[]>();

	// since we want to send breakpoint events, we will assign an id to every event
	// so that the frontend can match events with breakpoints.
	private _breakpointId = 1;

	constructor() {
		super();
	}

	public getContext() {
		return this._debugger.getContext();
	}

	/**
	 * Start executing the given program.
	 */
	public start(program: string, stopOnEntry: boolean) {

		this.loadSource(program);
		this._debugger = new Debugger({'path': program});
		this._currentLine = -1;

		if (stopOnEntry) {
			// we step once
			this.step(false, 'stopOnEntry');
		} else {
			// we just start to run until we hit a breakpoint or an exception
			this.continue();
		}
	}

	/**
	 * Continue execution to the end/beginning.
	 */
	public continue(reverse = false) {
		this.run(reverse, undefined);
	}

	/**
	 * Step to the next/previous non empty line.
	 */
	public step(reverse = false, event = 'stopOnStep') {
		this._debugger.stepInto();
		this.run(reverse, event);
	}

	/**
	 * Returns a 'stacktrace' where every 'stackframe' is a word from the current line.
	 */
	public stack(startFrame: number, endFrame: number): any {

		// TODO This just needs to pull a stack trace from a context object.

		const stack = this._debugger.getContext().stack;

		const frames = new Array<any>();
		// every word of the current line becomes a stack frame.
		for (let i = startFrame; i < Math.min(endFrame, stack.length); i++) {
			frames.push({
				index: i,
				name: stack[i].text,
				file: stack[i].file,
				line: stack[i].line,
			});
		}
		return {
			frames: frames,
			count: stack.length
		};
	}

	/*
	 * Set breakpoint in file with given line.
	 */
	public setBreakPoint(path: string, line: number): etherBreakpoint {

		const bp = <etherBreakpoint>{ verified: false, line, id: this._breakpointId++ };
		let bps = this._breakPoints.get(path);
		if (!bps) {
			bps = new Array<etherBreakpoint>();
			this._breakPoints.set(path, bps);
			this._debugger.toggleBreakpoint(path, line);
		}
		bps.push(bp);

		return bp;
	}

	/*
	 * Clear breakpoint in file with given line.
	 */
	public clearBreakPoint(path: string, line: number): etherBreakpoint | undefined {
		let bps = this._breakPoints.get(path);
		if (bps) {
			const index = bps.findIndex(bp => bp.line === line);
			if (index >= 0) {
				const bp = bps[index];
				bps.splice(index, 1);
				this._debugger.toggleBreakpoint(path, line);
				return bp;
			}
		}
		return undefined;
	}

	/*
	 * Clear all breakpoints for file.
	 */
	public clearBreakpoints(path: string): void {
		this._breakPoints.delete(path);
	}

	// private methods

	private loadSource(file: string) {
		if (this._sourceFile !== file) {
			this._sourceFile = file;
			this._sourceLines = readFileSync(this._sourceFile).toString().split('\n');
			this._debugger.add({ 'path': file });
		}
	}

	/**
	 * Run through the file.
	 * If stepEvent is specified only run a single step and emit the stepEvent.
	 */
	private run(reverse = false, stepEvent?: string) {
		if (reverse) {
			for (let ln = this._currentLine - 1; ln >= 0; ln--) {
				if (this.fireEventsForLine(ln, stepEvent)) {
					this._currentLine = ln;
					return;
				}
			}
			// no more lines: stop at first line
			this._currentLine = 0;
			this.sendEvent('stopOnEntry');
		} else {
			for (let ln = this._currentLine + 1; ln < this._sourceLines.length; ln++) {
				if (this.fireEventsForLine(ln, stepEvent)) {
					this._currentLine = ln;
					return true;
				}
			}
			// no more lines: run to end
			this.sendEvent('end');
		}
	}

	/**
	 * Fire events if line has a breakpoint or the word 'exception' is found.
	 * Returns true is execution needs to stop.
	 */
	private fireEventsForLine(ln: number, stepEvent?: string): boolean {

		const line = this._sourceLines[ln].trim();

		// if 'log(...)' found in source -> send argument to debug console
		const matches = /log\((.*)\)/.exec(line);
		if (matches && matches.length === 2) {
			this.sendEvent('output', matches[1], this._sourceFile, ln, matches.index)
		}

		// if word 'exception' found in source -> throw exception
		if (line.indexOf('exception') >= 0) {
			this.sendEvent('stopOnException');
			return true;
		}

		// is there a breakpoint?
		const breakpoints = this._breakPoints.get(this._sourceFile);
		if (breakpoints) {
			const bps = breakpoints.filter(bp => bp.line === ln);
			if (bps.length > 0) {

				// send 'stopped' event
				this.sendEvent('stopOnBreakpoint');

				// the following shows the use of 'breakpoint' events to update properties of a breakpoint in the UI
				// if breakpoint is not yet verified, verify it now and send a 'breakpoint' update event
				if (!bps[0].verified) {
					bps[0].verified = true;
					this.sendEvent('breakpointValidated', bps[0]);
				}
				return true;
			}
		}

		// non-empty line
		if (stepEvent && line.length > 0) {
			this.sendEvent(stepEvent);
			return true;
		}

		// nothing interesting found -> continue
		return false;
	}

	private sendEvent(event: string, ...args: any[]) {
		setImmediate(_ => {
			this.emit(event, ...args);
		});
	}
}
