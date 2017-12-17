import fs from 'fs';
import {join. dirname, sep} from 'path';
import {spawn} from 'child_process';
import {StreamCatcher} from './streamCatcher';

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



}
