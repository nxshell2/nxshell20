import { Buffer } from 'node:buffer'
import { PROTOCOL_CAPS_MAP, PROTOCOLS } from '../../common/nxsys/consts'
import { NxTerminal, NXTERMINAL_EVENTS } from '../../common/nxsys/terminal'
import { closeObject, createObjectHandle } from '../nxobjs'
import { NxNodeServer } from './node'
import { register } from './registry'
import { Telnet } from './telnet'

declare const powertools: any

class TelnetTerminal extends NxTerminal {
  parent: any = null
  telnetStrem: any = null
  connId: number = -1
  wait_bind_msg_queue: any[] = []
  channel: any = null

  constructor(parent: any, connId: number) {
    super()
    this.parent = parent
    this.connId = connId
  }

  async init(): Promise<void> {
    const conn = this.parent.refConnection(this.connId)
    const telnetStream = conn

    return new Promise((resolve, _reject) => {
      this.telnetStrem = telnetStream
      telnetStream.on('close', () => {
        this.emit(NXTERMINAL_EVENTS.CLOSE)
      })
      telnetStream.on('data', (data: any) => {
        this._write_channel(data)
      })
      this._write_channel(Buffer.from('Connected'))
      resolve()
    })
  }

  _write_channel(data: any) {
    if (this.channel) {
      this.channel.send(data)
    } else {
      this.wait_bind_msg_queue.push(data)
    }
  }

  async getConnId() {
    if (this.connId !== -1) {
      return this.connId
    } else {
      throw new Error('telnet terminal conn id not exist')
    }
  }

  async bindDataChannel(channelId: number) {
    this.channel = powertools.bindHsIPCChannelById(channelId)
    this.channel.on('data', (d: any) => {
      this.sendData(d)
    })
    if (this.wait_bind_msg_queue.length) {
      this.wait_bind_msg_queue.forEach((ele) => {
        this.channel.send(ele)
      })
    }
    this.wait_bind_msg_queue = []
  }

  async sendData(data: any) {
    if (this.telnetStrem) {
      this.telnetStrem.write(data)
    }
  }

  async setWindowSize(cols: number, rows: number) {
    if (this.telnetStrem) {
      this.telnetStrem.resize(cols, rows)
    }
  }

  async openTunnel() {
    throw new Error('Telnet no support tunnel')
  }

  async close() {
    if (this.telnetStrem) {
      this.telnetStrem = null
      this.parent.closeConnection(this.connId)
    }
  }

  async dispose() {
    await this.close()
    this.telnetStrem = null
    this.emit('dispose')
    this.removeAllListeners()
  }
}

class TelnetNodes extends NxNodeServer {
  caps: number = PROTOCOL_CAPS_MAP.TELNET
  initialized: any = null
  telnetConnect: any = null
  openedHandlers: number[] = []
  fsHandlers: number[] = []

  constructor(uuid: string, connProtocol: string, sessionConfig: any) {
    super(uuid, connProtocol, sessionConfig)
  }

  async _createConnection() {
    const host = this.config.hostAddress
    const port = this.config.hostTelnetPort || 23
    const connection = new Telnet(host, port)
    await connection.connect()
    this.telnetConnect = connection
    return connection
  }

  _closeConnection(conn: any) {
    conn.end()
  }

  async init() {
  }

  _removeOpenedHandler(handler: number) {
    const idx = this.openedHandlers.findIndex(val => val === handler)
    if (idx > -1) {
      this.openedHandlers.splice(idx, 1)
    }
  }

  async _prepareConnection(reuseConnId: number): Promise<number> {
    let connId = reuseConnId
    if (reuseConnId === -1) {
      connId = await this.createConnection()
    } else {
      throw new Error('Telnet session no support duplicate')
    }
    return connId
  }

  async getTerminalInstance(reuseConnId: number = -1): Promise<number> {
    reuseConnId = -1
    const connId = await this._prepareConnection(reuseConnId)
    const terminal = new TelnetTerminal(this, connId)
    const handler = createObjectHandle(terminal)
    this.openedHandlers.push(handler)
    terminal.once('dispose', () => {
      this._removeOpenedHandler(handler)
    })
    return handler
  }

  async getFSInstance(_reuseConnId: number = -1) {}
  async getNetInstance(_reuseConnId: number = -1) {}
  async getGUIInstance(_reuseConnId: number = -1) {}
  async getUserInstance(_reuseConnId: number = -1) {}

  getPathLib() {
    return super.getPathLib().posix
  }

  dispose() {
    if (this.openedHandlers.length) {
      for (let i = 0; i < this.openedHandlers.length; i++) {
        const handleId = this.openedHandlers[i]
        closeObject(handleId)
      }
    }
    this.emit('dispose')
    this.removeAllListeners()
  }
}

register(PROTOCOLS.TELNET, TelnetNodes)
