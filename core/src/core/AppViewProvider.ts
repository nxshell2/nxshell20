import type { BrowserWindowConstructorOptions } from 'electron'
import type { Channel } from './AppRPC'
import * as path from 'node:path'

import { BrowserWindow } from 'electron'

const WINDOW_TYPE = {
  MAIN_WINDOW: 'mainWindow',
  SUB_WINDOW: 'subWindow'
}

let windowProviderChannel: Channel | null = null

let lastWindowProviderRequestId = 0
const requestWaiters: { [key: number]: RequestWaiter } = {}

class RequestWaiter {
  resolve: (value: any) => void = () => { }
  reject: (e: any) => void = () => { }
  promise: Promise<any> | null = null
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (value: any) => {
        resolve(value)
      }
      this.reject = (e: any) => {
        reject(e)
      }
    })
  }

  wait() {
    return this.promise!
  }
}

function getLastWindowProviderRequestId(): number {
  const id = lastWindowProviderRequestId++
  if (lastWindowProviderRequestId === Number.MAX_SAFE_INTEGER) {
    lastWindowProviderRequestId = 0
  }
  return id
}

function onWindowProviderResponse(viewInfo: any) {
  const waiter = requestWaiters[viewInfo.reqId]
  if (!waiter) {
    console.error(new Error('invalid view info'))
    return
  }
  waiter.resolve(viewInfo)

  delete requestWaiters[viewInfo.reqId]
}

async function callViewProvider(webContentId: number | null = null, method: string = '', args: any[] = []) {
  const reqId = getLastWindowProviderRequestId()
  windowProviderChannel!.send({
    reqId,
    webContentId,
    method,
    args
  })
  const waiter = new RequestWaiter()
  requestWaiters[reqId] = waiter
  return await waiter.wait()
}

/**
 * 子视图代理：任意方法调用都被转成一次 view provider RPC。
 * 依赖渲染进程侧对 viewManagerChannel 的应答，目前该应答尚未实现。
 */
export async function createSubView(): Promise<any> {
  const { webContentId } = await callViewProvider()
  return new Proxy({}, {
    get(_target: any, method: string | symbol) {
      return async(...args: any[]) => await callViewProvider(webContentId, String(method), args)
    }
  })
}

function getNxshellLogo(): string {
  const baseDir = process.env.NODE_ENV === 'development' ? process.cwd() : process.resourcesPath
  return path.join(baseDir, 'nxshell.png')
}

const WINDOW_FLAG_OPTIONS: { [flag: string]: BrowserWindowConstructorOptions } = {
  frameless: { frame: false },
  hidden: { titleBarStyle: 'hidden' },
  transparent: { transparent: true }
}

const windowProviders = {
  async mainWindow(flags?: string[]): Promise<BrowserWindow> {
    const options: BrowserWindowConstructorOptions = {
      width: 1250,
      minWidth: 1250,
      height: 720,
      minHeight: 720,
      show: false,
      transparent: true,
      titleBarOverlay: process.platform !== 'darwin',
      webPreferences: {
        preload: path.join(__dirname, 'AppClient.js'),
        webviewTag: true,
        contextIsolation: false,
        sandbox: false
      } as any,
      icon: getNxshellLogo()
    }
    for (const flag of (flags || [])) {
      Object.assign(options, WINDOW_FLAG_OPTIONS[flag] || {})
    }
    const window = new BrowserWindow(options)

    window.once('ready-to-show', () => {
      window.show()
    })

    return window
  },

  async subWindow(flags?: string[]): Promise<BrowserWindow> {
    return await windowProviders.mainWindow(flags)
  }
}

export async function createWindow(windowType: string, flags?: string[]): Promise<BrowserWindow> {
  const windowCtor = (windowProviders as any)[windowType] || windowProviders.mainWindow
  return await windowCtor(flags)
}

export function registerWindowProvider(winProviderChannel: Channel) {
  if (windowProviderChannel) {
    return
  }
  windowProviderChannel = winProviderChannel

  winProviderChannel.on('data', (data: any) => {
    onWindowProviderResponse(data)
  })
}

export { WINDOW_TYPE }
