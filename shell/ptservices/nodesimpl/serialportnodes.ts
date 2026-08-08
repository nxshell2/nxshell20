import { PROTOCOL_CAPS_MAP, PROTOCOLS } from '../../common/nxsys/consts'
import { NxTerminal, NXTERMINAL_EVENTS } from '../../common/nxsys/terminal'
import { closeObject, createObjectHandle } from '../nxobjs'
import { NxNodeServer } from './node'
import { register } from './registry'

declare const powertools: any

let SerialPort: any = null
try {
  SerialPort = require('serialport').SerialPort
} catch(e) {
  console.warn('serialport import failed ', e)
}

class SerialPortTerminal extends NxTerminal {
  parent: any = null
  serialStream: any = null
  connId: number = -1
  wait_bind_msg_queue: any[] = []
  channel: any = null

  constructor(parent: any, connId: number) {
  super()
  this.parent = parent
  this.connId = connId
  }

  async init() {
  const conn = this.parent.refConnection(this.connId)
  return await new Promise((resolve) => {
    this.serialStream = conn
    conn.on('close', () => {
    this.emit(NXTERMINAL_EVENTS.CLOSE)
    })
    conn.on('data', (data: any) => {
    this._write_channel(data)
    })
    this._write_channel(Buffer.from('Connected'))
    resolve(true)
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
    throw new Error('serial terminal conn id not exist')
  }
  }

  async bindDataChannel(channelId: number) {
  this.channel = powertools.bindChannelByPeerId(channelId)
  if (this.wait_bind_msg_queue.length) {
    this.wait_bind_msg_queue.forEach((ele) => {
    this.channel.send(ele)
    })
  }
  this.wait_bind_msg_queue = []
  }

  async sendData(data: any) {
  if (this.serialStream) {
    this.serialStream.write(data)
  }
  }

  async setWindowSize(_cols: number, _rows: number) {
  }

  async openTunnel() {
  }

  async close() {
  if (this.serialStream) {
    this.serialStream = null
    this.parent.closeConnection(this.connId)
  }
  }

  async dispose() {
  await this.close()
  this.serialStream = null
  this.emit('dispose')
  this.removeAllListeners()
  }
}

class SerialPortNodes extends NxNodeServer {
  caps: number = PROTOCOL_CAPS_MAP.SERIALPORT
  initialized: any = null
  serialPortSession: any = null
  openedHandlers: number[] = []
  fsHandlers: number[] = []

  constructor(uuid: string, connProtocol: string, sessionConfig: any) {
  super(uuid, connProtocol, sessionConfig)
  }

  async _createConnection() {
  const open_options: any = {
    autoOpen: false,
    baudRate: this.config.baudRate,
    dataBits: this.config.dataBits,
    stopBits: this.config.stopBits,
    parity: this.config.parity
  }
  if (this.config.flowControl === 'rtscts') {
    open_options.rtscts = true
  } else if (this.config.flowControl === 'xon/xoff') {
    open_options.xon = true
    open_options.xoff = true
  } else {
    open_options.xany = true
  }
  const serial_port = new SerialPort({
    path: this.config.port,
    ...open_options
  })
  this.serialPortSession = serial_port
  return new Promise((resolve, reject) => {
    serial_port.open((e: any) => {
    if (e) {
      reject(e)
    } else {
      resolve(serial_port)
    }
    })
  })
  }

  _closeConnection(conn: any) {
  conn.close()
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
  }
  return connId
  }

  async getTerminalInstance(reuseConnId: number = -1): Promise<number> {
  const connId = await this._prepareConnection(reuseConnId)
  const terminal = new SerialPortTerminal(this, connId)
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
  this.serialPortSession.close()
  this.emit('dispose')
  this.removeAllListeners()
  }
}

register(PROTOCOLS.SERIALPORT, SerialPortNodes)

async function getSerialPorts(): Promise<{ path: string }[]> {
  let ports: any[] = []
  try {
  ports = await SerialPort.list()
  } catch(e) {
  console.log('get serial prots error ', e)
  }
  ports = ports.map((e: any) => {
  return { path: e.path }
  })
  return ports
}

export { getSerialPorts }
