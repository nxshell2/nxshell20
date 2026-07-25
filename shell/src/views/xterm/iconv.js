const iconv = require('iconv-lite');
const { EventEmitter } = require("events");

class Iconv extends EventEmitter {
    constructor(f, t) {
        super()
        this.from = f
        this.to = t
    }

    write(d) {
        if(d instanceof Array) {
            d = Buffer.from(d);
        }
        try {
            const str = iconv.decode(d, this.from)
            const output = iconv.encode(str, this.to)
            this.emit('data', output)
        } catch (err) {
            this.emit('error', err)
        }
    }
}

class NoIconv extends EventEmitter {
    constructor() {
        super()
    }

    write(d) {
        this.emit('data', d);
    }
}


export function create_iconv(from, to) {
    if(from === to ) {
        return new NoIconv();
    } else {
        return new Iconv(from, to);
    }
}