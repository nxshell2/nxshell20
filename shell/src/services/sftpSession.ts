import { createNodeSessionInstance } from './nxsys/nodes'
import { registerSessionFactory, SESSION_TYPES, SessionInterface } from './session'

class SFTPSession extends SessionInterface {
  fsInstance: any = null
  cfg: any = null
  nodeInstance: any = null
  control_channel: any = null
  constructor(params: any) {
  super(params.name, SESSION_TYPES.SFTP)
  this.cfg = params
  }

  async init() {
  let nodeInstance
  try {
    nodeInstance = await createNodeSessionInstance(this.cfg.uuid, this.cfg)
    await nodeInstance.init()
  } catch(err) {
    this.emit('data', 'Connect to server failed! \r\n')
    this.emit('error', 'Connect fail')
    return
  }
  this.nodeInstance = nodeInstance
  }

  async getFs() {
  if (this.fsInstance) {
    return this.fsInstance
  }

  const connId = this.cfg.connId === undefined ? -1 : this.cfg.connId

  const service = powertools.getService()
  const control = service.createChannel()

  control.on('data', (data: any) => {
    this.emit('control', data)
  })

  this.control_channel = control
  this.fsInstance = await this.nodeInstance.getFSInstance(connId, control.channelId)
  await this.fsInstance.init()
  return this.fsInstance
  }

  async sendControlData(data: any) {
  this.control_channel.send(data)
  }
}

async function createSFTPSession(params: any) {
  const sessionInst = new SFTPSession(params)
  await sessionInst.init()
  return sessionInst
}

registerSessionFactory(SESSION_TYPES.SFTP, createSFTPSession)
