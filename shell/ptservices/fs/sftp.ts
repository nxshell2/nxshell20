import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { Dirent } from '../../common/filesystem/dirent'
import { PtFileSystem } from '../../common/filesystem/filesystem'
import { IdGenerator } from '../../common/utils/idGenerator'

function normalizeAttr(attrs: any): any {
  return {
  mode: attrs.mode,
  uid: attrs.uid,
  gid: attrs.gid,
  size: attrs.size,
  atime: new Date(attrs.atime * 1000),
  mtime: new Date(attrs.mtime * 1000)
  }
}

function normalizeStat(stats: any): any {
  stats.atime = new Date(stats.atime * 1000)
  stats.mtime = new Date(stats.mtime * 1000)
  return stats
}

class SFTPFileSystem extends PtFileSystem {
  openedFiles: any = null
  sftp: any = null
  cwd: string = './'
  parent: any = null
  connId: number = -1
  handleGenerator: IdGenerator = new IdGenerator(1)

  constructor(parent: any, connId: number) {
  super()
  this.parent = parent
  this.openedFiles = Object.create(null)
  this.connId = connId
  }

  async init(): Promise<void> {
  await new Promise((resolve, reject) => {
    const conn = this.parent.refConnection(this.connId)
    conn.sftp((err: any, sftp: any) => {
    if (err) {
      reject(err)
    } else {
      this.sftp = sftp
      resolve(undefined)
    }
    })
  })
  }

  async getconn() {
  return this.connId
  }

  async realpath(path: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    this.sftp.realpath(path, (error: any, p: string) => {
    if (error) {
      reject(error)
    } else {
      resolve(p)
    }
    })
  })
  }

  async readdir(location: string): Promise<Dirent[]> {
  return await new Promise((resolve, reject) => {
    this.sftp.readdir(location || this.cwd, (error: any, list: any[]) => {
    if (error) {
      reject(error)
    } else {
      resolve(list.map(entry => new Dirent(entry.filename, normalizeAttr(entry.attrs))))
    }
    })
  })
  }

  async stat(path: string): Promise<any> {
  return await new Promise((resolve, reject) => {
    this.sftp.stat(path || this.cwd, (error: any, stats: any) => {
    if (error) {
      reject(error)
    } else {
      resolve(normalizeStat(stats))
    }
    })
  })
  }

  async lstat(path: string): Promise<any> {
  return await new Promise((resolve, reject) => {
    this.sftp.lstat(path || this.cwd, (error: any, stats: any) => {
    if (error) {
      reject(error)
    } else {
      resolve(normalizeStat(stats))
    }
    })
  })
  }

  async rename(src: string, dest: string): Promise<boolean> {
  return await new Promise((resolve, reject) => {
    this.sftp.rename(src, dest, (error: any) => {
    if (error) {
      reject(error)
    } else {
      resolve(true)
    }
    })
  })
  }

  async mkdir(path: string, attrs?: any): Promise<boolean> {
  return await new Promise((resolve, reject) => {
    this.sftp.mkdir(path, attrs || null, (error: any) => {
    if (error) {
      reject(error)
    } else {
      resolve(true)
    }
    })
  })
  }

  async rmdir(path: string): Promise<boolean> {
  return await new Promise((resolve, reject) => {
    this.sftp.rmdir(path, (error: any) => {
    if (error) {
      reject(error)
    } else {
      resolve(true)
    }
    })
  })
  }

  async open(filename: string, flags: string): Promise<number> {
  return await new Promise((resolve, reject) => {
    this.sftp.open(filename, flags, (error: any, handle: any) => {
    if (error) {
      reject(error)
      return
    }
    const retHanlde = this.handleGenerator.getNext()
    this.openedFiles[retHanlde] = handle
    resolve(retHanlde)
    })
  })
  }

  async read(handle: number, buffer: Buffer, offset: number, length: number, position: number): Promise<{ bytesRead: number }> {
  return await new Promise((resolve, reject) => {
    if (!this.openedFiles[handle]) {
    reject(new Error('handle no exits'))
    return
    }
    this.sftp.read(this.openedFiles[handle], buffer, offset, length, position, (error: any, bytesRead: number) => {
    if (error) {
      reject(error)
    } else {
      resolve({ bytesRead })
    }
    })
  })
  }

  async write(handle: number, buffer: Buffer, offset: number, lenght: number, position: number): Promise<number> {
  return await new Promise((resolve, reject) => {
    if (!this.openedFiles[handle]) {
    reject(new Error('Invalid file handle'))
    return
    }
    this.sftp.write(this.openedFiles[handle], buffer, offset, lenght, position, (err: any, bytesWrite: number) => {
    if (err) {
      reject(err); return
    }
    resolve(bytesWrite)
    })
  })
  }

  async close(handle: number): Promise<boolean> {
  return await new Promise((resolve, reject) => {
    if (!this.openedFiles[handle]) {
    reject(new Error('Invalid file handle'))
    return
    }
    this.sftp.close(this.openedFiles[handle], (error: any) => {
    if (error) {
      reject(error)
    } else {
      delete this.openedFiles[handle]
      resolve(true)
    }
    })
  })
  }

  async unlink(path: string): Promise<boolean> {
  return await new Promise((resolve, reject) => {
    this.sftp.unlink(path, (error: any) => {
    if (error) {
      reject(error)
    } else {
      resolve(true)
    }
    })
  })
  }

  async readlink(path: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    this.sftp.readlink(path, (error: any, s: string) => {
    if (error) {
      reject(error)
    } else {
      resolve(s)
    }
    })
  })
  }

  async chmod(path: string, permission: number): Promise<boolean> {
  return await new Promise((resolve, reject) => {
    this.sftp.chmod(path, permission, (error: any) => {
    if (error) {
      reject(error)
    } else {
      resolve(true)
    }
    })
  })
  }

  async exists(path: string): Promise<boolean> {
  try {
    await this.stat(path)
  } catch(e: any) {
    if (e.message.trim() === 'No such file') {
    return false
    }
  }
  return true
  }

  async syncRemoteToLocal(remote_path: string, local_file: string): Promise<void> {
  const local_path = path.join(os.tmpdir(), local_file)
  return new Promise((resolve, reject) => {
    this.sftp.fastGet(remote_path, local_path, (error: any) => {
    if (error) {
      reject()
    } else {
      resolve()
    }
    })
  })
  }

  async syncLocalToRemote(remote_path: string, local_file: string): Promise<void> {
  const local_path = path.join(os.tmpdir(), local_file)
  return new Promise((resolve, reject) => {
    this.sftp.fastPut(local_path, remote_path, (error: any) => {
    if (error) {
      reject()
    } else {
      resolve()
    }
    })
  })
  }

  async syncGetLocalFileContent(local_file: string): Promise<Buffer> {
  const local_path = path.join(os.tmpdir(), local_file)
  return fs.readFileSync(local_path)
  }

  async syncWriteLocalFileContent(local_file: string, v: any): Promise<void> {
  const local_path = path.join(os.tmpdir(), local_file)
  return fs.writeFileSync(local_path, v)
  }

  async readFileContent(filePath: string): Promise<string> {
  const handle = await this.open(filePath, 'r')
  try {
    const stats = await this.stat(filePath)
    const size = stats.size
    if (size === 0) {
    return ''
    }
    const buffer = Buffer.alloc(size)
    await this.read(handle, buffer, 0, size, 0)
    return buffer.toString('utf8')
  } finally {
    await this.close(handle)
  }
  }

  async writeFileContent(filePath: string, content: string): Promise<void> {
  const handle = await this.open(filePath, 'w')
  try {
    const buffer = Buffer.from(content, 'utf8')
    await this.write(handle, buffer, 0, buffer.length, 0)
  } finally {
    await this.close(handle)
  }
  }

  dispose() {
  for (const index in this.openedFiles) {
    this.close(parseInt(index))
  }
  this.sftp.end()
  this.parent.closeConnection(this.connId)
  this.emit('dispose')
  this.removeAllListeners()
  }
}

export { SFTPFileSystem }
