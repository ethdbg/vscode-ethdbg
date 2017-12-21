import {ReadLine, createInterface } from 'readline';
import {Writable, Readable} from 'stream';
import {EventEmitter} from 'events';
import {events} from './types';
import * as byline from 'byline';

interface Response {
  event: string;
  data?: Object;
}

export class StreamParser extends EventEmitter {
  public input: Writable;
  public output: Readable;
  public error: Readable;
  public ready: boolean;
  private readyListeners: Array<Function>;
  constructor() {
    super();
    this.ready = false;
    this.readyListeners = new Array();
    this.on(events.ready, () => {
      this.ready = true;
      this.readyListeners.forEach(f => f('Ethereum Debugger Ready'));
    });
  }

  public launch(stdin: Writable, stdout: Readable, stderr: Readable) {
    this.input = stdin;
    this.output = stdout;
    this.error = stderr;

    this.output = byline(this.output);
    this.output.on('data', this.dataIn.bind(this)); // this is where we recieve our messages

    this.output.on('error', (err) =>  {
       console.log(`[ETHDBG][STDERR]: ${err.message}`);
    });

    // debugging
    this.output.on('message', (msg) => {
      console.log('message msg from stdout [this should not happen]: ' + msg);
    });

    this.error.on('data', (data) => {
      console.log(`[ETHDBG][ERROR]: ${data}`);
    });

    this.error.on('message', (msg) => {
       console.log(`[ETHDBG][MSG]: ${msg}`);
    })
  }

  public request(ev, data) {
    console.log(`EVENT: ${ev}, OBJ: ${data}`);
    this.input.write(this.serialize(ev, data));
    this.input.write('\n');
  }

  private onReady(f) {
    if (this.ready) {
      f('Ethereum Debugger ready');
    } else {
      this.readyListeners.push(f);
    }
  }

  public isReady(): Promise<string> {
    return new Promise(resolve => this.onReady(res => resolve(res)));
  }

  public destroy() {
    return Promise.resolve();
  }

  private dataIn(data: string) {
    const res = this.deserialize(data);
    console.log(`emitting event: ${res.event}`);
    this.emit(res.event, res.data);
  }
  /**
   * puts an event, and the data for the event into a string format
   * pads the event with 0 if the event is less than 32 bytes
   */
  private serialize(ev, data): string {
    if (ev.length > 32) {
      throw new Error('Event name too long');
    }
    return ev.padEnd(32, '0').concat(JSON.stringify(data));
  }

  private deserialize(msg): Response {
    if (msg instanceof Buffer) {
      msg = msg.toString();
    }
    else if (!(typeof msg === 'string')) {
      throw new Error('Cannot deserialize data which is not a String or Buffer');
    }
    const event:string = this.trimZeros(msg.substr(0, 32));
    // if not a valid event, we assume it is a console message meant for the user
    if (!(event in events)) {
      return {
        event: "message",
        data: msg,
      };
    }

    const data = (msg.substr(32) != 'null' && msg.substr(32) != 'undefined') ? JSON.parse(msg.substr(32)) : null;

    return {
      event,
      data,
    };
  }

  /** trims _all_ zeros from a string
   * @param{string} str - string to trim zeros from
   * @return{string} - trim without leading zeros
  */
  private trimZeros(str): string {
    return str.replace(/[0]+|[0]+$/g, '');
  }
}
