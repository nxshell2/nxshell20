import { getGlobalId } from '../../common/utils/idGenerator'
import { registerSessionFactory, SESSION_TYPES, SessionInterface } from './session'

class SfpEditorSession extends SessionInterface {
  cfg: any
  sftp: any
  remote_path: any
  ext_name: any
  local_file: string
  constructor(params: any) {
  super(params.name, SESSION_TYPES.EDITOR)
  this.cfg = params
  this.sftp = params.config.sftp
  this.remote_path = params.config.remote_path
  this.ext_name = params.config.ext_name
  this.local_file = `sfpeditor_${getGlobalId()}`
  }

  async init() {
  await this.sftp.syncRemoteToLocal(this.remote_path, this.local_file)
  }

  async readFileContent() {
  return await this.sftp.readFileContent(this.local_file)
  }

  async writeFileContent(v: any) {
  return await this.sftp.writeFileContent(this.local_file, v)
  }

  async saveToRemote() {
  return await this.sftp.syncLocalToRemote(this.remote_path, this.local_file)
  }
}

async function createSftpEditorSession(params: any) {
  return new SfpEditorSession(params)
}

registerSessionFactory(SESSION_TYPES.EDITOR, createSftpEditorSession)
