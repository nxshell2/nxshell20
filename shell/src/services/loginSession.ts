import { registerSessionFactory, SESSION_TYPES, SessionInterface } from './session'

class LoginSession extends SessionInterface {
  constructor() {
  super('Login', SESSION_TYPES.LOGIN)
  }
}

function createLoginSession() {
  return new LoginSession()
}

registerSessionFactory(SESSION_TYPES.LOGIN, createLoginSession)
