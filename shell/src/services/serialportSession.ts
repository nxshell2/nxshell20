import WaitObject from '../../common/utils/waitObject'
import { createNodeSessionInstance } from './nxsys/nodes'

import { registerSessionFactory, SESSION_TYPES, SessionInterface } from './session'

/**
 * Shell会话
 * @extends {SessionInterface}
 */
class SerialPortSession extends SessionInterface {
  cfg: any = null
  connId: any = null
  clientReady: any = null
  terminal: any = null
  nodeInstance: any = null
  send_data: any = null
  resize_window: any = null
  /**
   * Shell会话构造函数
   * @constructor
   * @param {object} params Shell参数
   * @param {string} params.name 会话名称
   * @param {string} params.uuid 会话对应的UUID
   * @param {string} params.host 会话主机
   * @param {number} params.port 会话端口
   * @param {string} [params.username] 用户名称，可选
   * @param {string} [params.password] 用户密码，可选
   * @param {String} [params.auth="password"] 认证方法
   */
  constructor(params: any) {
  super(params.name, SESSION_TYPES.SHELL)
  this.cfg = params
  this.connId = params.connId
  }

  async init() {
  this.emit('data', 'Connect to server ...\r\n\n')

  this.clientReady = new WaitObject()
  this.resize_window = async(cols: any, rows: any) => {
    if (!this.clientReady) {
    return
    }
    try {
    await this.clientReady.wait()
    } catch(e) {
    return
    }
    if (!this.terminal) {
    return
    }
    try {
    await this.terminal.setWindowSize(cols, rows)
    } catch(e) {
    // terminal 已关闭时忽略 resize 失败
    }
  }
  this.on('resize', this.resize_window)

  let nodeInstance
  try {
    nodeInstance = await createNodeSessionInstance(this.cfg.uuid, this.cfg)
    await nodeInstance.init()
  } catch(err: any) {
    console.error(err)
    this.emit('data', 'Connect to server failed! \r\n')
    this.emit('error', 'Connect fail')
    return
  }
  this.nodeInstance = nodeInstance

  const service = powertools.getService()
  const channel = service.createChannel()

  channel.on('ready', () => {
    console.log('channel ready')
  })

  channel.on('data', (data: any) => {
    this.emit('data', data)
  })

  try {
    /**
     * @type {NxTerminalClient}
     */
    let connId = -1
    if (this.connId >= 0) {
    connId = this.connId
    }
    this.terminal = await this.nodeInstance.getTerminalInstance(connId)
    await this.terminal.init(this.cfg.xterm)
    this.clientReady.resolve()
  } catch(err: any) {
    // notify to frontend
    const msg = err.toString()
    this.emit('data', Buffer.from(msg))
    this.terminal = null
    return
  }

  this.send_data = async(data: any) => {
    await this.terminal.sendData(data)
  }
  this.on('send_data', this.send_data)

  this.terminal.bindDataChannel(channel.channelId)
  }

  async openTunnel() {
  return await this.terminal.openTunnel()
  }

  async getTermConnId() {
  return await this.terminal.getConnId()
  }

  _close_terminal() {
  this.terminal.dispose()
  this.terminal = null
  this.clientReady = null
  this.off('send_data', this.send_data)
  this.off('resize', this.resize_window)
  }

  close() {
  if (this.terminal) {
    this._close_terminal()
  }
  // this.emit("close");
  super.close()
  }

  async duplicate() {
  const session = new SerialPortSession(this.cfg)
  session.init()
  return session
  }

  async refresh() {
  if (this.terminal) {
    this._close_terminal()
  }
  await this.init()
  }
}

async function createSerialPortSession(params: any) {
  const session = new SerialPortSession(params)
  session.on('error', (err) => {
  console.error('SerialPortSession error:', err)
  })
  session.init()
  return session
}

registerSessionFactory(SESSION_TYPES.SERIALPORT, createSerialPortSession)
