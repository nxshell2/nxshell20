import { createNodeSessionInstance } from './nxsys/nodes'
import { registerSessionFactory, SESSION_TYPES, SessionInterface } from './session'

class FTPSession extends SessionInterface {
  fsInstance: any = null
  cfg: any = null
  nodeInstance: any = null
  constructor(params: any) {
  super('FTP', SESSION_TYPES.FTP)
  this.cfg = params
  }

  async init() {
  const cfg = this.cfg
  let secure = cfg.secure
  try {
    secure = JSON.parse(cfg.secure)
  } catch {
    /* ignore */
  }

  let nodeInstance
  try {
    nodeInstance = await createNodeSessionInstance(this.cfg.uuid, {
    host: cfg.hostAddress,
    port: cfg.hostFtpPort,
    protocal: 'ftp',
    username: cfg.username,
    password: cfg.password,
    secure
    })
    await nodeInstance.init()
  } catch(err) {
    console.error(err)
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
  this.fsInstance = await this.nodeInstance.getFSInstance()
  await this.fsInstance.init()
  return this.fsInstance
  }
}

async function createFTPSession(params: any) {
  const sessionInst = new FTPSession(params)
  await sessionInst.init()
  return sessionInst
}

registerSessionFactory(SESSION_TYPES.FTP, createFTPSession)
