import { NxNode } from '../../../common/nxsys/nodes'
import { FTPFileSystem } from '../filesystem/ftp'
import { SFTPFileSystem } from '../filesystem/sftp'
import { NxTerminalClient } from './terminal'

class NxNodeClient extends NxNode {
  service: any = null
  handler: any = null
  constructor(handler: any, sessionUUID: any, connProtocol: any, sessionConfig: any) {
  super(sessionUUID, connProtocol, sessionConfig)
  this.service = powertools.getService()
  this.handler = handler
  }

  async init() {
  await this.service.callObject(this.handler, 'init')
  }

  async updateConfig(newConfig: any) {
  await this.service.callObject(this.handler, 'updateConfig', newConfig)
  }

  async getTerminalInstance(reuseConnId: any = -1, control_ch?: any): Promise<any> {
  const termHandler = await this.service.callObject(this.handler, 'getTerminalInstance', reuseConnId, control_ch)
  return new NxTerminalClient(termHandler)
  }

  async getFSInstance(reuseConnId: any = -1, control_ch?: any): Promise<any> {
  const fsHandler = await this.service.callObject(this.handler, 'getFSInstance', reuseConnId, control_ch)
  let fsIns = null
  switch (this.protocol) {
    case 'FTP':
    fsIns = new FTPFileSystem(fsHandler)
    break
    case 'SFTP':
    default:
    fsIns = new SFTPFileSystem(fsHandler)
    break
  }
  return fsIns
  }

  async getNetInstance(_reuseConnId: any = -1) {}
  async getGUIInstance(_reuseConnId: any = -1) {}
  async getUserInstance(_reuseConnId: any = -1) {}

  dispose() {
  this.service.callObject(this.handler, 'dispose')
  }
}

const nodeClients = Object.create(null)
const nodeClientsSessions = Object.create(null)

function createNodeClient(handler: any, sessionUUID: any, protocal: any, sessionConfig: any) {
  if (handler in nodeClients) {
  return nodeClients[handler]
  }

  const node = new NxNodeClient(handler, sessionUUID, protocal, sessionConfig)

  nodeClients[handler] = node
  nodeClientsSessions[sessionUUID] = node

  return node
}

/**
 * 创建一个节点会话实例代理，指向服务的会话实例
 *
 * @param {string} sessionUUID 会话配置的UUID
 * @param {object} sessionConfig 会话的配置
 * @returns {Promise.<Object.<Proxy>>}
 */
export async function createNodeSessionInstance(sessionUUID: any, sessionConfig: any) {
  const service = powertools.getService()
  const handler = await service.createNodeSessionInstance(sessionUUID, sessionConfig)

  return createNodeClient(handler, sessionUUID, sessionConfig.protocal, sessionConfig)
}

export async function getNodeSessionInstanceByUUID(sessionUUID: any) {
  const client = nodeClientsSessions[sessionUUID]

  if (!client) {
  throw new Error('no instance')
  }

  return client
}
