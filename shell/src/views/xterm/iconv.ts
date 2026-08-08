import { EventEmitter } from 'node:events'
import * as iconv from 'iconv-lite'

class Iconv extends EventEmitter {
  from: string
  to: string

  constructor(f: string, t: string) {
  super()
  this.from = f
  this.to = t
  }

  write(d: any) {
  if (Array.isArray(d)) {
    d = Buffer.from(d)
  }
  try {
    const str = iconv.decode(d, this.from)
    const output = iconv.encode(str, this.to)
    this.emit('data', output)
  } catch(err) {
    this.emit('error', err)
  }
  }
}

class NoIconv extends EventEmitter {
  constructor() {
  super()
  }

  write(d: any) {
  this.emit('data', d)
  }
}

export function create_iconv(from: string, to: string): Iconv | NoIconv {
  if (from === to) {
  return new NoIconv()
  } else {
  return new Iconv(from, to)
  }
}
