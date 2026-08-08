import type { ShellConfig } from '../../sessionManage/shellConfig'
import { createClient } from 'webdav'
/**
 * WebDAV 存储 Provider
 */
import StorageProviderInterface from '../storageInterface'

interface WebDAVEntry {
  basename: string
  type?: string
  resourcetype?: { collection?: unknown } | string
}

class WebDAVStorage extends StorageProviderInterface {
  client: any = null
  basePath: string = ''
  status: string = 'offline'

  /**
   * @param {ShellConfig} config
   * @param {string} config.url - WebDAV 服务器 URL
   * @param {string} config.username - 用户名
   * @param {string} config.password - 密码
   * @param {string} [config.basePath] - 基础路径，默认 /nxshell
   */
  constructor(config: ShellConfig | null) {
  super('WebDAVStorage')

  if (!config || !config.url) {
    throw new Error('WebDAV URL is required')
  }

  this.basePath = config.basePath || '/nxshell'

  // 创建 WebDAV 客户端
  this.client = createClient(config.url, {
    username: config.username || '',
    password: config.password || ''
  })

  this._ensureBasePath()
  }

  /**
   * 确保基础路径存在
   */
  async _ensureBasePath() {
  try {
    const exists = await this.client.exists(this.basePath)
    if (!exists) {
    await this.client.createDirectory(this.basePath, { recursive: true })
    }
    this.status = 'online'
  } catch(e: any) {
    console.error('WebDAV ensure base path failed:', e)
    this.status = 'error'
  }
  }

  /**
   * 获取完整路径
   * @param {string} name
   */
  _getFullPath(name: string) {
  return `${this.basePath}/${name}.json`
  }

  /**
   * 保存数据
   * @param {string} name
   * @param {object} object
   */
  async save(name: string, object: any) {
  const path = this._getFullPath(name)
  const content = JSON.stringify(object, null, 2)

  try {
    await this.client.putFileContents(path, content, {
    contentLength: Buffer.byteLength(content, 'utf8'),
    overwrite: true
    })
    this.status = 'online'
  } catch(e: any) {
    this.status = 'error'
    throw new Error(`WebDAV save failed: ${e.message}`)
  }
  }

  /**
   * 读取数据
   * @param {string} name
   * @returns {object | null}
   */
  async read(name: string) {
  const path = this._getFullPath(name)

  try {
    const exists = await this.client.exists(path)
    if (!exists) {
    return null
    }

    const content = await this.client.getFileContents(path, {
    format: 'text'
    })

    this.status = 'online'
    return JSON.parse(content)
  } catch(e: any) {
    if (e.status === 404) {
    return null
    }
    this.status = 'error'
    throw new Error(`WebDAV read failed: ${e.message}`)
  }
  }

  /**
   * 删除数据
   * @param {string} name
   */
  async delete(name: string) {
  const path = this._getFullPath(name)

  try {
    const exists = await this.client.exists(path)
    if (exists) {
    await this.client.deleteFile(path)
    }
    this.status = 'online'
  } catch(e: any) {
    this.status = 'error'
    throw new Error(`WebDAV delete failed: ${e.message}`)
  }
  }

  /**
   * 列出所有配置
   * @returns {string[]}
   */
  async list() {
  try {
    const items = await this.client.getDirectoryContents(this.basePath)
    this.status = 'online'
    return (items as WebDAVEntry[])
    .filter((item: WebDAVEntry) => item.type === 'file' && item.basename.endsWith('.json'))
    .map((item: WebDAVEntry) => item.basename.replace('.json', ''))
  } catch(e: any) {
    this.status = 'error'
    throw new Error(`WebDAV list failed: ${e.message}`)
  }
  }

  /**
   * 列出目录内容
   * @param {string} dirPath
   * @returns {{name: string; isDir: boolean}[]}
   */
  async listDir(dirPath: string) {
  try {
    const items = await this.client.getDirectoryContents(dirPath)
    return (items as WebDAVEntry[])
    .filter((item: WebDAVEntry) => item.basename) // 过滤掉当前目录自身
    .map((item: WebDAVEntry) => {
      const isDir = !!(item.type === 'directory'
      || (item.resourcetype && typeof item.resourcetype === 'object' && 'collection' in item.resourcetype))
      return {
      name: item.basename,
      isDir
      }
    })
  } catch(e: any) {
    if (e.status === 404) {
    return []
    }
    throw new Error(`WebDAV listDir failed: ${e.message}`)
  }
  }

  /**
   * 读取文件内容（文本）
   * @param {string} filePath
   * @returns {string|null}
   */
  async readFile(filePath: string) {
  try {
    const exists = await this.client.exists(filePath)
    if (!exists) {
    return null
    }
    return await this.client.getFileContents(filePath, { format: 'text' })
  } catch(e: any) {
    if (e.status === 404) {
    return null
    }
    throw new Error(`WebDAV readFile failed: ${e.message}`)
  }
  }

  /**
   * 写入文本文件
   * @param {string} filePath
   * @param {string} content
   */
  async writeFile(filePath: string, content: string) {
  try {
    await this.client.putFileContents(filePath, content, {
    contentLength: Buffer.byteLength(content, 'utf8'),
    overwrite: true
    })
    this.status = 'online'
  } catch(e: any) {
    this.status = 'error'
    throw new Error(`WebDAV writeFile failed: ${e.message}`)
  }
  }

  /**
   * 递归创建目录
   * @param {string} dirPath
   */
  async createDir(dirPath: string) {
  try {
    await this.client.createDirectory(dirPath, { recursive: true })
    this.status = 'online'
  } catch(e: any) {
    this.status = 'error'
    throw new Error(`WebDAV createDir failed: ${e.message}`)
  }
  }

  /**
   * 删除文件
   * @param {string} filePath
   */
  async deleteFile(filePath: string) {
  try {
    const exists = await this.client.exists(filePath)
    if (exists) {
    await this.client.deleteFile(filePath)
    }
    this.status = 'online'
  } catch(e: any) {
    this.status = 'error'
    throw new Error(`WebDAV deleteFile failed: ${e.message}`)
  }
  }

  /**
   * 移动/重命名文件
   * @param {string} from
   * @param {string} to
   */
  async move(from: string, to: string) {
  try {
    await this.client.moveFile(from, to)
    this.status = 'online'
  } catch(e: any) {
    this.status = 'error'
    throw new Error(`WebDAV move failed: ${e.message}`)
  }
  }

  /**
   * 测试连接
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async testConnection() {
  try {
    // 尝试获取根目录
    await this.client.getDirectoryContents('/')
    this.status = 'online'
    return { success: true, message: 'WebDAV 连接成功' }
  } catch(e: any) {
    this.status = 'error'
    if (e.status === 401) {
    return { success: false, message: '认证失败，请检查用户名和密码' }
    }
    if (e.status === 404) {
    return { success: false, message: '路径不存在' }
    }
    return { success: false, message: e.message || '连接失败' }
  }
  }

  /**
   * 获取状态
   */
  getStatus() {
  return this.status
  }
}

export default WebDAVStorage
