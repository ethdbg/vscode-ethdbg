import {Writable, Readable} from 'stream';
import {EventEmitter} from 'events';
import {events} from './types';

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
  private internalEvents: EventEmitter;
  constructor() {
    super();
    this.ready = false;
    this.internalEvents = new EventEmitter();
    this.readyListeners = new Array();
    this.internalEvents.on(events.ready, () => {
      this.ready = true;
      this.readyListeners.forEach(f => f('Ethereum Debugger Ready'));
    });
    console.log('get into the constructor of StreamParser');
  }

  public launch(stdin: Writable, stdout: Readable, stderr: Readable) {
    console.log('in streamParser launch');
    this.input = stdin;
    this.output = stdout;
    this.error = stderr;

    // set up parsing events into internalEvents
    this.output.on('message', this.dataIn.bind(this));

    this.output.on('data', (msg) => {
      console.log(msg.toString()); // regular output is logged to the Vscode console
    });

    this.output.on('error', (err) =>  {
       console.log(`[ETHDBG][ERR]: ${err}`);
    });

    // debugging
    this.output.on('message', (msg) => {
      console.log(msg);
    });

    this.error.on('data', (data) => {
      console.log(`[ETHDBG][ERROR]: ${data}`);
    });
    this.error.on('message', (msg) => {
       console.log(`[ETHDBG][MSG]: ${msg}`);
    })

    this.internalEvents.on(events.hitBreakpoint, (evObj) => {
      this.emit(events.hitBreakpoint, evObj);
    });
  }

  public request(ev, data) {
    this.input.write(this.serialize(ev, data));
  }

  public isReady(): Promise<string> {
    return new Promise(resolve => this.onReady(res => resolve(res)));
  }

  public destroy() {
    return Promise.resolve();
  }

  private onReady(f) {
    if (this.ready) {
      f('Ethereum Debugger ready');
    } else {
      this.readyListeners.push(f);
    }
  }

  private dataIn(data: string) {
    console.log(data.toString());
    const res = this.deserialize(data);
    console.log(`emitting event: ${res.event} ${res.data}`);
    this.internalEvents.emit(res.event, res.data);
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
      throw new Error('Cannot deserialize data which is not a String');
    }
    const event = this.trimZeros(msg.substr(0, 32));
    const data = msg.length > 32 ? JSON.parse(msg.substr(33)) : null;

    return {
      event,
      data,
    };
  }

  /** trims _all_ zeros from a string
   * @param{string} str - string to trim zeros from
   * @param{number} len - length of string
   * @return{string} - trim without leading zeros
  */
  private trimZeros(str): string {
    return str.replace(/[0]+|[0]+$/g, '');
  }
}
