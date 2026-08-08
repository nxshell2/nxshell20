import { registerSessionFactory, SESSION_TYPES, SessionInterface } from './session'

class GlobalSettingSession extends SessionInterface {
  constructor() {
  super('GlobalSetting', SESSION_TYPES.GLOBALSETTING)
  }
}

function createGlobalSettingSession() {
  return new GlobalSettingSession()
}

registerSessionFactory(SESSION_TYPES.GLOBALSETTING, createGlobalSettingSession)
