import { registerSessionFactory, SESSION_TYPES, SessionInterface } from './session'

class VNCSession extends SessionInterface {
  fsInstance: any = null
  cfg: any = null
  constructor(params: any) {
  super(params.name, SESSION_TYPES.VNC)
  this.cfg = params
  }

  async init() {
  }
}

async function createVNCSession(params: any) {
  return new VNCSession(params)
}

registerSessionFactory(SESSION_TYPES.VNC, createVNCSession)
