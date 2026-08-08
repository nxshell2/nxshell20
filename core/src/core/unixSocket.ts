import * as net from 'net';
import { EventEmitter } from "events";

class Client extends EventEmitter {
  unix_file: string;
  socket: net.Socket | null = null;

  constructor(unix_file: string) {
    super();
    this.unix_file = unix_file;
    this.socket = null;
  }

  async createConnect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.unix_file, () => {
        console.log('unix socket connected to ', this.unix_file);
      });
      this.socket.on('data', (d: Buffer) => {
        this.emit('data', d);
      });

      this.socket.on('end', () => {
        this.emit('end');
      });

      this.socket.on('error', (code: any) => {
        this.emit('error', code);
      });

      resolve(true);
    });
  }
}

export { Client };
