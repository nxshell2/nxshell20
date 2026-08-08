import { PtSFTPFileSystemClient } from '../../../common/filesystem/filesystem'
import { FStats } from '../../../common/filesystem/fstat'

class Dirent extends FStats {
  name = ''
  stat: any = null

  constructor(name: string, stat: any) {
  super(stat)
  this.name = name
  this.stat = stat
  }

  isBlockDevice() {
  return false
  }

  isCharacterDevice() {
  return false
  }

  isDirectory() {
  return (this.stats as any).type === 'directory'
  }

  isFIFO() {
  return false
  }

  isFile() {
  return (this.stats as any).type === 'file'
  }

  isSocket() {
  return false
  }

  isSymbolicLink() {
  return false
  }

  getUid() {
  return 0
  }

  getGid() {
  return 0
  }

  getSize() {
  return this.stats.size
  }

  getATime(): any {
  return new Date((this.stats as any).lastmod)
  }

  getMTime(): any {
  return new Date((this.stats as any).lastmod)
  }

  getPermsString() {
  return '---------'
  }
}

export class WDFileSystem extends PtSFTPFileSystemClient {
  serviceProxy: any = null
  service: any = null
  constructor(handle: any) {
  super(handle)
  }

  async init() {
  this.service = powertools.getService()
  }

  async open(fileName: any, flags: any) {
  return await this.service.callFs(this.handle, 'open', ...[fileName, flags])
  }

  async readdir(location: any) {
  const dirList = await this.service.callFs(this.handle, 'readdir', location)
  return dirList.map((dirent: any) => {
    return new Dirent(dirent.basename, dirent)
  })
  }

  async lstat(path: any) {
  const stat = await this.service.callFs(this.handle, 'lstat', path)
  return stat
  }

  async mkdir(path: any, attrs?: any) {
  return await this.service.callFs(this.handle, 'mkdir', path, attrs)
  }

  async rmdir(path: any) {
  return await this.service.callFs(this.handle, 'rmdir', path)
  }

  async unlink(path: any) {
  return await this.service.callFs(this.handle, 'unlink', path)
  }

  async dispose() {
  const service = powertools.getService()
  await service.closeFsInstance(this.handle)
  }
}
