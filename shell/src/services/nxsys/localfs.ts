import { Dirent } from '../../../common/filesystem/dirent'
import { PROTOCOLS } from '../../../common/nxsys/consts'
import WaitObject from '../../../common/utils/waitObject'

class LocalFileClient {
  /**
   * @type {WaitObject}
   */
  initialized: any = null
  service: any = null
  handle: any = null
  constructor(handle: any) {
  this.handle = handle
  this.service = powertools.getService()
  }

  async init() {
  if (this.initialized) {
    await this.initialized.wait()
    return
  }
  this.initialized = new WaitObject()
  try {
    await this.service.callObject(this.handle, 'init')
    this.initialized.resolve()
  } catch(err) {
    this.initialized.reject(err)
  }
  }

  async getconn() {
  return await this.service.callObject(this.handle, 'getconn')
  }

  async open(fileName: any, flags: any) {
  return await this.service.callObject(this.handle, 'open', ...[fileName, flags])
  }

  async write(handle: any, buffer: any, offset: any, length: any, position: any) {
  return await this.service.callObject(this.handle, 'write', ...[handle, buffer, offset, length, position])
  }

  async read(handle: any, buffer: any, offset: any, length: any, position: any) {
  return await this.service.callObject(this.handle, 'read', ...[handle, buffer, offset, length, position])
  }

  async readdir(location: any) {
  const dirList = await this.service.callObject(this.handle, 'readdir', location)
  return dirList.map((dirent: any) => {
    return new Dirent(dirent.name, dirent.stats)
  })
  }

  async lstat(path: any) {
  const stat = await this.service.callObject(this.handle, 'lstat', path)
  return stat
  }

  async stat(path: any) {
  const stat = await this.service.callObject(this.handle, 'stat', path)
  return stat
  }

  async realpath(path: any) {
  const p = await this.service.callObject(this.handle, 'realpath', path)
  return p
  }

  async mkdir(path: any, attrs?: any) {
  return await this.service.callObject(this.handle, 'mkdir', path, attrs)
  }

  async rmdir(path: any) {
  return await this.service.callObject(this.handle, 'rmdir', path)
  }

  async rename(srcPath: any, destPath: any) {
  return await this.service.callObject(this.handle, 'rename', srcPath, destPath)
  }

  async unlink(path: any) {
  return await this.service.callObject(this.handle, 'unlink', path)
  }

  async exists(path: any) {
  return await this.service.callObject(this.handle, 'exists', path)
  }

  async pathresolve(path1: any, path2: any) {
  return await this.service.callObject(this.handle, 'pathresolve', path1, path2)
  }

  async basename(path: any) {
  return await this.service.callObject(this.handle, 'basename', path)
  }

  async close(handle: any) {
  return await this.service.callObject(this.handle, 'close', handle)
  }

  async dispose() {
  this.service.closeObject(this.handle)
  }
}

export async function createLocalFs() {
  const service = powertools.getService()

  const handle = await service.createNodeSessionInstance('', { protocal: PROTOCOLS.LOCAL, uuid: '' })
  const fshandle = await service.callObject(handle, 'getFSInstance')
  const client = new LocalFileClient(fshandle)
  await client.init()

  return client
}
