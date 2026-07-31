import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from "events";
import { Buffer } from "buffer";

const PID = process.pid;

function get_unix_file(): string {
    let prefix = os.platform() === 'win32' ? "\\\\?\\pipe" : "/tmp";
    return path.join(prefix, `${PID}.sock`);
}

class IdGenerator {
    lastId: number = 0;
    constructor(initId: number = 0) {
        this.lastId = initId;
    }

    getNext(): number {
        return this.lastId++;
    }
}

class Channel extends EventEmitter {
    socket: net.Socket;
    channelId: number = 0;

    constructor(socket: net.Socket) {
        super();
        this.socket = socket;
        this.socket.on('data', (d: Buffer) => {
            this.emit('data', d);
        });

        this.socket.on('end', () => {
            this.emit('end');
        });
    }

    async _socket_write(buffer: any): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket.write(buffer, () => {
                resolve();
            });
        });
    }

    send(d: any) {
        return this._socket_write(d);
    }

    writeChannelId(id: number) {
        this.channelId = id;
        let buffer = Buffer.alloc(4);
        buffer.writeUInt32LE(id);
        this._socket_write(buffer);
    }

    setChannelId(id: number) {
        this.channelId = id;
    }
}

class Server extends EventEmitter {
    server: net.Server | null = null;
    channel_maps: { [key: number]: Channel } = {};
    IdGenerator: IdGenerator;

    constructor() {
        super();
        this.IdGenerator = new IdGenerator();
    }

    init() {
        this.server = net.createServer((c) => {
            let uid = this.IdGenerator.getNext();
            let channel = new Channel(c);
            this.channel_maps[uid] = channel;
            channel.writeChannelId(uid);
        });
        this.server.listen(get_unix_file(), () => {
            console.log('unix sock listen on ', get_unix_file());
        });
    }

    getChannelById(id: number): Channel {
        let channel = this.channel_maps[id];
        if (!channel) {
            throw new Error(`channel id ${id} no exist `);
        }
        return channel;
    }
}

class Client extends EventEmitter {
    channel_maps: { [key: number]: Channel } = {};

    constructor() {
        super();
        this.channel_maps = {};
    }

    createConnect(unix_file: string): Promise<Channel> {
        return new Promise((resolve, reject) => {
            let socket = net.createConnection(unix_file, () => {
                console.log('unix socket connected');
            });
            let channel = new Channel(socket);
            channel.once('data', (d: Buffer) => {
                let uid = d.readUInt32LE();
                channel.setChannelId(uid);

                this.channel_maps[uid] = channel;
                resolve(channel);
            });
            channel.once('error', (error: any) => {
                reject(error);
            });
        });
    }
}

let g_server: Server | null = null;
let g_client: Client | null = null;

function createServer() {
    if (g_server) {
        return;
    }
    g_server = new Server();
    g_server.init();
}

function createConnect(unix_file: string): Promise<Channel> {
    if (!g_client) {
        g_client = new Client();
    }
    return g_client.createConnect(unix_file);
}

export {
    get_unix_file as getConnectFile,
    createServer,
    createConnect,
    bindHsIPCChannelById
};

function bindHsIPCChannelById(id: number): Channel {
    return g_server!.getChannelById(id);
}
