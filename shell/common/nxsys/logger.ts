import { EventEmitter } from 'node:events'

class NxLogger extends EventEmitter {
  file: string
  constructor(file: string) {
    super()
    this.file = file
  }

  info() {
  }
}

export { NxLogger }
