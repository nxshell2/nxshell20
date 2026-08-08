import { NxTerminal } from '../../../common/nxsys/terminal'

export class NxTerminalClient extends NxTerminal {
  cols = 0
  rows = 0
  service: any = null
  handler: any = null
  constructor(handler: any) {
  super()
  this.service = powertools.getService()
  this.handler = handler
  }

  async init(termOps?: any) {
  return await this.service.callObject(this.handler, 'init', termOps)
  }

  async bindDataChannel(channelId: any) {
  return await this.service.callObject(this.handler, 'bindDataChannel', channelId)
  }

  async sendData(data: any) {
  return await this.service.callObject(this.handler, 'sendData', data)
  }

  async setWindowSize(cols: number, rows: number) {
  if (!this.handler) {
    return
  }
  await this.service.callObject(this.handler, 'setWindowSize', cols, rows)
  this.cols = cols
  this.rows = rows
  }

  async openTunnel() {
  return await this.service.callObject(this.handler, 'openTunnel')
  }

  async getConnId() {
  return await this.service.callObject(this.handler, 'getConnId')
  }

  async exec(command: any) {
  return await this.service.callObject(this.handler, 'exec', command)
  }

  async getWindowSize(): Promise<any> {
  const { cols, rows } = this
  return {
    cols,
    rows
  }
  }

  async close() {
  await this.service.callObject(this.handler, 'close')
  }

  async dispose() {
  await this.service.callObject(this.handler, 'dispose')
  this.emit('dispose')
  this.service = null
  this.handler = null
  this.removeAllListeners()
  }
};
