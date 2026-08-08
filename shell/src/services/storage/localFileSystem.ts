import path from 'node:path'
/**
 * 本地文件
 * 使用LocalStorage进行配置的存储
 * 默认基础存储，所有需要存储的数据均在此处进行保存
 */
import StorageProviderInterface from './storageInterface'

const STORAGE_ITEM = '__PT_LOCAL_STORAGE__'
const CONFIG_DIR = 'nxshell-config'

function getAppDataDirty(): string {
  const portable = powertools.getPortable()
  let app_path = null
  if (portable) {
  app_path = path.join(path.dirname(powertools.getAppPath()), '.nxconfig')
  } else {
  app_path = powertools.getAppDataDirty()
  }
  return path.normalize(path.join(app_path, CONFIG_DIR))
}

function getLegacyAppDataDirty(): string {
  const portable = powertools.getPortable()
  let app_path = null
  if (portable) {
  app_path = path.join(path.dirname(powertools.getAppPath()), '.nxconfig')
  } else {
  app_path = powertools.getAppDataDirty()
  }
  return path.normalize(app_path)
}

function getSoftwareConfig(): string {
  const s = path.normalize(path.join(powertools.getAppHomeDirty(), '.nxsoftconfig'))
  return s
}

class LocalFileStorage extends StorageProviderInterface {
  service: any = null
  handler: string | number | null = null
  file_path: string = ''
  nxsoftconfig: Record<string, unknown> | null = null
  migrated: boolean = false
  constructor() {
  super('PtLocalFileStorage')
  this.service = powertools.getService()
  this.handler = null
  this.file_path = ''
  }

  async _init() {
  this.handler = await this.service.createFileStorage()
  await this._migrateToConfigDir()
  this.nxsoftconfig = await this.readSoftConfig()
  }

  async _migrateToConfigDir() {
  if (this.migrated) {
    return
  }
  this.migrated = true
  const legacyDir = getLegacyAppDataDirty()
  const newDir = getAppDataDirty()
  try {
    await this.createDir(newDir)
  } catch(e: unknown) {
    // dir may already exist
  }
  const itemsToMigrate = ['sessions', 'mounts.json', 'settings.json']
  for (const item of itemsToMigrate) {
    const src = path.join(legacyDir, item)
    const dst = path.join(newDir, item)
    try {
    const exists = await this.service.callObject(this.handler, 'path_exists', src)
    if (exists) {
      const dstExists = await this.service.callObject(this.handler, 'path_exists', dst)
      if (!dstExists) {
      await this.service.callObject(this.handler, 'move', src, dst)
      console.log(`[LocalFileStorage] Migrated ${item} to ${CONFIG_DIR}/`)
      }
    }
    } catch(e: unknown) {
    console.warn(`[LocalFileStorage] Migration skipped for ${item}:`, (e as Error).message)
    }
  }
  }

  async setConfigPath(file_path: string) {
  const result = await this.service.callObject(this.handler, 'path_exists', file_path)
  if (result) {
    this.file_path = file_path
  }
  }

  getAppDataDirty() {
  if (this.file_path === '') {
    return getAppDataDirty()
  } else {
    return this.file_path
  }
  }

  async saveSoftConfig(object: Record<string, unknown>) {
  if (!this.handler) {
    await this._init()
  }
  await this.service.callObject(this.handler, 'save', path.join(getSoftwareConfig(), 'nxsoft.config'), JSON.stringify(object))
  }

  async save(name: string, object: Record<string, unknown>) {
  if (!this.handler) {
    await this._init()
  }
  await this.service.callObject(this.handler, 'save', path.join(this.getAppDataDirty(), STORAGE_ITEM + name), JSON.stringify(object))
  }

  async readSoftConfig(): Promise<Record<string, unknown> | null> {
  if (!this.handler) {
    await this._init()
  }
  const rawVal = await this.service.callObject(this.handler, 'read', path.join(getSoftwareConfig(), 'nxsoft.config'))
  if (!rawVal) {
    return null
  }

  return JSON.parse(rawVal as string) as Record<string, unknown>
  }

  async read(name: string): Promise<unknown> {
  if (!this.handler) {
    await this._init()
  }
  const rawVal = await this.service.callObject(this.handler, 'read', path.join(this.getAppDataDirty(), STORAGE_ITEM + name))
  if (!rawVal) {
    return null
  }

  return JSON.parse(rawVal as string) as unknown
  }

  async readLegacy(name: string): Promise<unknown> {
  if (!this.handler) {
    await this._init()
  }
  const rawVal = await this.service.callObject(this.handler, 'read', path.join(getLegacyAppDataDirty(), STORAGE_ITEM + name))
  if (!rawVal) {
    return null
  }
  return JSON.parse(rawVal as string) as unknown
  }

  async export(src: string, dst: string) {
  if (!this.handler) {
    await this._init()
  }
  return await this.service.callObject(this.handler, 'export', path.join(this.getAppDataDirty(), STORAGE_ITEM + src), dst)
  }

  async import(src: string, dst: string) {
  if (!this.handler) {
    await this._init()
  }
  return await this.service.callObject(this.handler, 'import', src, path.join(this.getAppDataDirty(), STORAGE_ITEM + dst))
  }

  async listDir(dirPath: string): Promise<{ name: string, isDir: boolean }[]> {
  if (!this.handler) {
    await this._init()
  }
  return (await this.service.callObject(this.handler, 'listDir', dirPath)) as { name: string, isDir: boolean }[]
  }

  async readFile(filePath: string): Promise<string | null> {
  if (!this.handler) {
    await this._init()
  }
  return (await this.service.callObject(this.handler, 'readFile', filePath)) as string | null
  }

  async writeFile(filePath: string, content: string) {
  if (!this.handler) {
    await this._init()
  }
  return await this.service.callObject(this.handler, 'writeFile', filePath, content)
  }

  async createDir(dirPath: string) {
  if (!this.handler) {
    await this._init()
  }
  return await this.service.callObject(this.handler, 'createDir', dirPath)
  }

  async deleteFile(filePath: string) {
  if (!this.handler) {
    await this._init()
  }
  return await this.service.callObject(this.handler, 'deleteFile', filePath)
  }

  async move(from: string, to: string) {
  if (!this.handler) {
    await this._init()
  }
  return await this.service.callObject(this.handler, 'move', from, to)
  }
}

export default LocalFileStorage
