import { NxLogger } from '../../../common/nxsys/logger'

class NxLoggerClient extends NxLogger {
  service: any = null
  handle: any = null
  constructor(handle: any) {
  super('')
  this.service = powertools.getService()
  this.handle = handle
  }

  async _init() {
  }

  info(s?: any) {
  this.service.callObject(this.handle, 'info', s)
  }
}

export async function createLogger(file: any) {
  const service = powertools.getService()

  const handle = await service.createLogger(file)

  const client = new NxLoggerClient(handle)
  await client._init()

  return client
}
