import { PROTOCOLS, PROTOCOL_CAPS_MAP } from "../../common/nxsys/consts";
import { FTPFileSystem } from "../fs/ftp";
import { createObjectHandle, closeObject } from "../nxobjs";
import { NxNodeServer } from "./node";
import { register } from "./registry";

const Client: any = require('nxshell-ftp');

class FTPNodes extends NxNodeServer {
  caps: number = PROTOCOL_CAPS_MAP.SSH2
  initialized: any = null
  sshSession: any = null
  openedHandlers: number[] = []
  fsHandlers: number[] = []

  constructor(uuid: string, connProtocol: string, sessionConfig: any) {
  super(uuid, connProtocol, sessionConfig)
  }

  updateConfig(cfg: any) {
  let secure: any = cfg.secure
  try {
    secure = JSON.parse(cfg.secure)
  } catch(e) {
  }
  this.config = {
    host: cfg.hostAddress,
    port: cfg.hostFtpPort,
    protocal: 'ftp',
    username: cfg.username,
    password: cfg.password,
    secure
  }
  }

  async _createConnection() {
  const sessConfig = this.config
  const authConfig = {
    password: sessConfig.password,
    user: sessConfig.username,
    host: sessConfig.host.trim(),
    port: sessConfig.port,
    secure: sessConfig.secure,
    secureOptions: { rejectUnauthorized: false }
  }
  const ftp_client = new Client()
  return new Promise((resolve, reject) => {
    ftp_client.on('ready', () => {
    resolve(ftp_client)
    })
    ftp_client.on('error', (err: any) => {
    reject(err)
    })
    ftp_client.connect(authConfig)
  })
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
  }
  return connId
  }

  async getTerminalInstance(reuseConnId: number = -1) {
  }

  async getFSInstance(reuseConnId: number = -1): Promise<number> {
  const connId = await this._prepareConnection(reuseConnId)
  const fs = new FTPFileSystem(this, connId)
  const handler = createObjectHandle(fs)
  this.openedHandlers.push(handler)
  fs.once('dispose', () => {
    this._removeOpenedHandler(handler)
  })
  return handler
  }

  async getNetInstance(reuseConnId: number = -1) {}
  async getGUIInstance(reuseConnId: number = -1) {}
  async getUserInstance(reuseConnId: number = -1) {}

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
  this.sshSession.end()
  this.emit('dispose')
  this.removeAllListeners()
  }
}

register(PROTOCOLS.FTP, FTPNodes)
