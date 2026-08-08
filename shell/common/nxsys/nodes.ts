import { EventEmitter } from 'node:events'

import * as path from 'node:path'
import { NODES_CAPS, PROTOCOL_CAPS_MAP } from './consts'

class NxNode extends EventEmitter {
  caps: number = 0
  uuid: string = ''
  protocol: string = ''
  config: any = null

  constructor(uuid: string, connProtocol: string, config: any) {
    super()
    this.uuid = uuid
    const protocol = connProtocol.toUpperCase()
    if (!(protocol in PROTOCOL_CAPS_MAP)) {
      throw new Error(`unsupported protocol type: ${connProtocol}`)
    }
    this.protocol = protocol
    this.caps = PROTOCOL_CAPS_MAP[protocol]
    this.config = config
  }

  async init() {
    throw new Error('Unimplemented!')
  }

  updateConfig(newConfig: any) {
    this.config = newConfig
  }

  hasTerminal() {
    return (this.caps & NODES_CAPS.TERMINAL) !== 0
  }

  hasGUI() {
    return (this.caps & NODES_CAPS.GUI) !== 0
  }

  hasFS() {
    return (this.caps & NODES_CAPS.FS) !== 0
  }

  hasNet() {
    return (this.caps & NODES_CAPS.NET) !== 0
  }

  hasUser() {
    return (this.caps & NODES_CAPS.USERS) !== 0
  }

  getPrimaryCap() {
    if (this.hasTerminal()) {
      return NODES_CAPS.TERMINAL
    } else if (this.hasGUI()) {
      return NODES_CAPS.GUI
    } else if (this.hasFS()) {
      return NODES_CAPS.FS
    } else if (this.hasNet()) {
      return NODES_CAPS.NET
    } else if (this.hasUser()) {
      return NODES_CAPS.USERS
    }
  }

  async getTerminalInstance(reuseConnId: number = -1): Promise<unknown> {}
  async getFSInstance(reuseConnId: number = -1): Promise<unknown> {}
  async getNetInstance(reuseConnId: number = -1): Promise<unknown> {}
  async getGUIInstance(reuseConnId: number = -1): Promise<unknown> {}
  async getUserInstance(reuseConnId: number = -1): Promise<unknown> {}

  getPathLib() {
    return path
  }

  dispose() {}
}

export { NxNode }
