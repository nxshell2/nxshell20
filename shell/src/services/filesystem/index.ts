import { FTPFileSystem } from './ftp'
import { SFTPFileSystem } from './sftp'
import { WDFileSystem } from './webdav'

export async function createFsInstance(sessionCfg: any) {
  const service = powertools.getService()
  const instId = await service.createFsInstance(sessionCfg)
  let newFS: any = null
  if (sessionCfg.protocol === 'ftp') {
  newFS = new FTPFileSystem(instId)
  } else if (sessionCfg.protocol === 'webdav') {
  newFS = new WDFileSystem(instId)
  } else {
  newFS = new SFTPFileSystem(instId)
  }
  await newFS.init()
  return newFS
}
