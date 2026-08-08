import { NxNode } from '../../common/nxsys/nodes'
import { IdGenerator } from '../../common/utils/idGenerator'

class NxNodeConnection {
  refCount: number = 0
  conn: any
  constructor(nativeConn: any) {
  this.conn = nativeConn
  }

  ref() {
  this.refCount++
  return this.conn
  }

  unref(releaseCallback: (conn: any) => void) {
  this.refCount--
  if (this.refCount === 0) {
    releaseCallback(this.conn)
  }
  }
}

class NxNodeServer extends NxNode {
  connections: any = Object.create(null)
  idGenerator: IdGenerator = new IdGenerator()

  async _createConnection(): Promise<unknown> {
  }

  _closeConnection(conn: any) {
  }

  getConnection(connId: number): NxNodeConnection | null {
  return this.connections[connId] || null
  }

  refConnection(connId: number): any {
  const conn = this.connections[connId]
  if (!conn) {
    throw new Error(`Invalid connection id:${connId}`)
  }
  return conn.ref()
  }

  closeConnection(connId: number) {
  const connWrap = this.connections[connId]
  if (!connWrap) {
    return
  }
  connWrap.unref((conn: any) => {
    this._closeConnection(conn)
  })
  }

  closeAllConnections() {
  Object.keys(this.connections).forEach((connId) => {
    this.closeConnection(parseInt(connId))
  })
  }

  async createConnection(): Promise<number> {
  const conn = await this._createConnection()
  const connId = this.idGenerator.getNext()
  const connWrap = new NxNodeConnection(conn)
  this.connections[connId] = connWrap
  return connId
  }
}

export { NxNodeServer }
