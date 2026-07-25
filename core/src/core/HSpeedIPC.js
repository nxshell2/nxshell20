const net = require('net');
const os = require('os');
const path = require('path');
const { EventEmitter } = require("events");
const { Buffer } = require("buffer");

const PID = process.pid;

function get_unix_file() {
    let prefix = os.platform() === 'win32' ? "\\\\?\\pipe" :"/tmp";
    return path.join(prefix, `${PID}.sock`);
}

class IdGenerator {
    lastId = 0
    constructor(initId=0) {
        this.lastId = initId;
    }

    getNext() {
        return this.lastId++
    }
}

class Channel extends EventEmitter{
    constructor(socket) {
        super();
        this.socket = socket;
        this.channelId = 0;
        this.socket.on('data', (d)=> {
            this.emit('data', d);
        })

        this.socket.on('end', ()=> {
            this.emit('end');
        })
    }

    async _socket_write(buffer) {
        return new Promise((resolve, reject)=> {
            this.socket.write(buffer, ()=> {
                resolve();
            })
        })
    }

    send(d) {
        return this._socket_write(d);
    }

    writeChannelId(id) {
        this.channelId = id;
        let buffer = Buffer.alloc(4);
        buffer.writeUInt32LE(id);
        this._socket_write(buffer);
    }
    setChannelId(id) {
        this.channelId = id;
    }
}

class Server extends EventEmitter{
    constructor() {
        super();
        this.channel_maps = {};
        this.IdGenerator = new IdGenerator();
    }

    init() {
        this.server = net.createServer((c)=> {
            let uid = this.IdGenerator.getNext();
            let channel = new Channel(c);
            this.channel_maps[uid] = channel;
            channel.writeChannelId(uid);
        })
        this.server.listen(get_unix_file(), ()=> {
            console.log('unix sock listen on ', get_unix_file());
        })
    }

    getChannelById(id) {
        let channel = this.channel_maps[id];
        if(!channel) {
            throw new Error(`channel id ${id} no exist `)
        }
        return channel; 
    }
}

class Client extends EventEmitter{
    constructor() {
        super()
        this.channel_maps = {};
    }

    createConnect(unix_file) {
        return new Promise((resolve, reject)=> {
            let socket = net.createConnection(unix_file, ()=> {
                console.log('unix socket connected')
            })
            let channel = new Channel(socket);
            channel.once('data', (d)=> {
                let uid = d.readUInt32LE();
                channel.setChannelId(uid);

                this.channel_maps[uid] = channel;
                resolve(channel);
            })
            channel.once('error', (error)=>{
                reject(error);
            })
        })
    }
}

let g_server = null;
let g_client = null;

function createServer() {
    if(g_server) {
        return;
    }
    g_server = new Server();
    g_server.init();
}

function createConnect(unix_file) {
    if(!g_client) {
        g_client = new Client();
    }
    return g_client.createConnect(unix_file);
}

module.exports = {
    getConnectFile: ()=> { return get_unix_file() },
    createServer,
    createConnect,
    bindHsIPCChannelById: (id)=> { return g_server.getChannelById(id) }
}