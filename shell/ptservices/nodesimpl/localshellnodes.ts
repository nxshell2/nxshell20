import { Buffer } from 'node:buffer'
import * as os from 'node:os'
import * as pty from 'node-pty'

import { PROTOCOL_CAPS_MAP, PROTOCOLS } from '../../common/nxsys/consts'
import { NxTerminal, NXTERMINAL_EVENTS } from '../../common/nxsys/terminal'
import { closeObject, createObjectHandle } from '../nxobjs'
import { NxNodeServer } from './node'
import { register } from './registry'

/**
 * 解析本地终端要启动的 shell 可执行文件路径。
 *
 * 必须返回绝对路径：node-pty 在 unix 下用 posix_spawnp 启动进程，
 * 若传入裸名字（如 'zsh'）会依赖 PATH 搜索。Electron 从 Dock/Finder 启动时
 * 继承的 PATH 往往不完整，导致 posix_spawnp 找不到可执行文件而失败。
 *
 * 优先级：用户配置的绝对路径 > process.env.SHELL（登录 shell）> 平台默认绝对路径。
 */
function resolveShell(preferred?: string): string {
  const platform = os.platform()
  if (platform === 'win32') {
    return preferred || 'powershell.exe'
  }
  if (preferred && preferred.startsWith('/')) {
    return preferred
  }
  if (process.env.SHELL) {
    return process.env.SHELL
  }
  const fallbackName = preferred || (platform === 'darwin' ? 'zsh' : 'bash')
  return `/bin/${fallbackName}`
}

/**
 * 渲染进程与 shell 之间的 IPC 数据通道结构。
 * 由 powertools.bindHsIPCChannelById 返回，对应 core/HSpeedIPC.ts 的 Channel（继承 EventEmitter）。
 */
interface IDataChannel {
  send: (data: string | Buffer) => void
  on: (event: 'data', listener: (data: Buffer) => void) => void
}

declare const powertools: {
  bindHsIPCChannelById: (id: number) => IDataChannel
}

class LocalShellTerminal extends NxTerminal {
  parent: LocalShellNodes
  shellStrem: pty.IPty | null = null
  connId: number = -1
  wait_bind_msg_queue: (string | Buffer)[] = []
  channel: IDataChannel | null = null

  constructor(parent: LocalShellNodes, connId: number) {
    super()
    this.parent = parent
    this.connId = connId
  }

  async init(): Promise<void> {
    const conn = this.parent.refConnection(this.connId) as pty.IPty
    this.shellStrem = conn
    conn.onExit(() => {
      this.emit(NXTERMINAL_EVENTS.CLOSE)
    })
    conn.onData((data) => {
      this._write_channel(data)
    })
    this._write_channel(Buffer.from('Connected'))
  }

  _write_channel(data: string | Buffer) {
    if (this.channel) {
      this.channel.send(data)
    } else {
      this.wait_bind_msg_queue.push(data)
    }
  }

  async getConnId(): Promise<number> {
    if (this.connId !== -1) {
      return this.connId
    } else {
      throw new Error('LocalShell terminal conn id not exist')
    }
  }

  async bindDataChannel(channelId: number) {
    const channel = powertools.bindHsIPCChannelById(channelId)
    this.channel = channel
    channel.on('data', (d: Buffer) => {
      this.sendData(d)
    })
    if (this.wait_bind_msg_queue.length) {
      this.wait_bind_msg_queue.forEach((ele) => {
        channel.send(ele)
      })
    }
    this.wait_bind_msg_queue = []
  }

  async sendData(data: string | Buffer) {
    if (this.shellStrem) {
      this.shellStrem.write(data)
    }
  }

  async setWindowSize(cols: number, rows: number) {
    this.shellStrem?.resize(cols, rows)
  }

  async openTunnel() {
    throw new Error('Telnet no support tunnel')
  }

  async close() {
    if (this.shellStrem) {
      this.shellStrem = null
      this.parent.closeConnection(this.connId)
    }
  }

  async dispose() {
    await this.close()
    this.shellStrem = null
    this.emit('dispose')
    this.removeAllListeners()
  }
}

class LocalShellNodes extends NxNodeServer {
  caps: number = PROTOCOL_CAPS_MAP.LOCALSHELL
  openedHandlers: number[] = []

  constructor(uuid: string, connProtocol: string, sessionConfig: any) {
    super(uuid, connProtocol, sessionConfig)
  }

  async _createConnection(): Promise<pty.IPty> {
    const shell = resolveShell(this.config?.shellType)
    const ptyProcess = pty.spawn(shell, [], {
      cols: 150,
      rows: 50,
      cwd: os.homedir(),
      env: process.env
    })
    return ptyProcess
  }

  _closeConnection(conn: pty.IPty) {
    conn.kill()
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
      throw new Error('LocalShell session no support duplicate')
    }
    return connId
  }

  async getTerminalInstance(reuseConnId: number = -1): Promise<number> {
    reuseConnId = -1
    const connId = await this._prepareConnection(reuseConnId)
    const terminal = new LocalShellTerminal(this, connId)
    const handler = createObjectHandle(terminal)
    this.openedHandlers.push(handler)
    terminal.once('dispose', () => {
      this._removeOpenedHandler(handler)
    })
    return handler
  }

  async getFSInstance(_reuseConnId: number = -1): Promise<void> {}
  async getNetInstance(_reuseConnId: number = -1): Promise<void> {}
  async getGUIInstance(_reuseConnId: number = -1): Promise<void> {}
  async getUserInstance(_reuseConnId: number = -1): Promise<void> {}

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

register(PROTOCOLS.LOCALSHELL, LocalShellNodes)
