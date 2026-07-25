const net = require('net');
const { EventEmitter } = require("events");

class Client extends EventEmitter{
    constructor(unix_file) {
        super()
        this.unix_file = unix_file;
        this.socket = null;
    }

    async createConnect() {
        return new Promise((resolve, reject)=> {
            this.socket = net.createConnection(this.unix_file, ()=> {
                console.log('unix socket connected to ', this.unix_file)
            })
            this.socket.on('data', (d) => {
                this.emit('data', d);
            })
    
            this.socket.on('end', () => {
                this.emit('end');
            })

            this.socket.on('error', (code) => {
                this.emit('error', code);
            })

            resolve(true);
        })
    }
}


module.exports = {
    Client
}