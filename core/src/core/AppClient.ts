import { Buffer } from 'node:buffer'
import * as os from 'node:os'
import process from 'node:process'
import { clipboard, desktopCapturer, ipcRenderer, shell, webUtils } from 'electron'
import { portable, version, weblink } from '../version'
import { ChannelClient, dispatch, RPCClient } from './AppRPC'
import { createConnect } from './HSpeedIPC'
import WebSocket from './vnctcpproxy'

const PID = process.pid
const allServices: { [key: string]: any } = {}

function createIPCSend(serviceName?: string) {
  const ipcChannel = serviceName ? `ptIPC:${serviceName}` : 'ptIPC'
  return function(data: any) {
  ipcRenderer.send(ipcChannel, data)
  }
}

function createRPC(serviceName?: string): RPCClient {
  const rpc = new RPCClient(createIPCSend(serviceName))
  return rpc
}

function createChannel(serviceName?: string): ChannelClient {
  const channelClient = new ChannelClient(createIPCSend(serviceName), PID)
  return channelClient
}

function createIPCHandler(serviceName: string, serviceInstance: any) {
  let channelName = 'ptIPC'
  if (serviceName) {
  channelName += `:${serviceName}`
  }

  ipcRenderer.removeAllListeners(channelName)
  const handler = (e: any, ...args: any[]) => {
  dispatch(args[0], () => {}, (rpcRetResponse: any) => {
    serviceInstance.rpcClient.dispatchResult(rpcRetResponse)
  }, (channelData: any) => {
    serviceInstance.channelClient.dispatchChannelData(channelData)
  })
  }
  serviceInstance._ipcHandler = handler
  ipcRenderer.on(channelName, handler)
}

class PowerToolsService {
  rpcClient: RPCClient
  channelClient: ChannelClient
  _ipcHandler: any = null

  constructor(serviceName: string) {
  this.rpcClient = createRPC(serviceName)
  this.channelClient = createChannel(serviceName)

  createIPCHandler(serviceName, this)
  }
}

function createService(serviceName?: string) {
  serviceName = serviceName || ''
  let serviceInstance = new PowerToolsService(serviceName)

  let instProxy = new Proxy(serviceInstance, {
  get(target: any, prop: string, receiver: any) {
    if (prop === 'createChannel') {
    return function() {
      return serviceInstance.channelClient.createChannel()
    }
    }

    return async function(...args: any[]) {
    return await serviceInstance.rpcClient.doCall(prop, ...args)
    }
  }
  })

  allServices[serviceName] = instProxy

  return instProxy
}

let mediaRecorder: MediaRecorder | null = null
let recordedChunks: BlobPart[] = []
let stream: MediaStream | null = null

async function start_capture() {
  let sources = await desktopCapturer.getSources({ types: ['screen'] as any })
  let source: any = sources.find((e: any) => e.name === 'Screen')
  if (!source) {
  source = sources.find((e: any) => e.name === 'Entire Screen')
  }
  if (!source && sources.length !== 0) {
  source = sources[0]
  }
  if (!source) {
  throw new Error('No screen found')
  }
  try {
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: source.id
    }
    } as any
  })
  const options = { mimeType: 'video/webm; codecs=vp9' }
  mediaRecorder = new MediaRecorder(stream, options)
  mediaRecorder.ondataavailable = (e: BlobEvent) => {
    recordedChunks.push(e.data)
  }
  mediaRecorder.start()
  } catch(err) {
  console.log('navigator get user media error ', err)
  }
}

async function stop_capture(): Promise<Buffer | null> {
  let buffer: Buffer | null = null
  return new Promise((resolve, reject) => {
  if (mediaRecorder) {
    mediaRecorder.onstop = async() => {
    const blob = new Blob(recordedChunks, {
      type: 'video/webm; codecs=vp9'
    })

    buffer = Buffer.from(await blob.arrayBuffer())
    mediaRecorder = null
    recordedChunks = []
    stream!.getTracks().forEach((track: MediaStreamTrack) => {
      track.stop()
    })
    resolve(buffer)
    }
    mediaRecorder.stop()
  } else {
    mediaRecorder = null
    recordedChunks = []
    resolve(buffer)
  }
  })
}

const powertools = {
  getService(serviceName?: string) {
  let serviceInstance = allServices[serviceName || '']
  if (!serviceInstance) {
    serviceInstance = createService(serviceName)
  }

  return serviceInstance
  },

  minimizeWindow() {
  ipcRenderer.send('pt:window-minimize')
  },

  maximizeWindow() {
  ipcRenderer.send('pt:window-maximize')
  },

  unmaximizeWindow() {
  ipcRenderer.send('pt:window-unmaximize')
  },

  closeWindow() {
  ipcRenderer.send('pt:window-close')
  },

  isWindowMaximized() {
  return ipcRenderer.sendSync('pt:window-is-maximized')
  },

  onWindowEvent(event: string, callback: () => void) {
  ipcRenderer.on('pt:window-event', (e: any, ev: string) => {
    if (ev === event) {
    callback()
    }
  })
  },

  clipboardReadText() {
  return clipboard.readText()
  },

  clipboardWriteText(s: string) {
  return clipboard.writeText(s)
  },

  openExterUrl(url: string) {
  return shell.openExternal(url)
  },

  openDialog(url: string, options?: any) {
  function optionsStringify() {
    if (!options) {
    return ''
    }

    return Object.keys(options).map((key) => {
    return `${key}=${options[key]}`
    }).join(',')
  }
  return window.open(url, 'modal', optionsStringify())
  },

  getAppDataDirty() {
  return ipcRenderer.sendSync('pt:get-path-sync', 'appData')
  },

  getAppHomeDirty() {
  return ipcRenderer.sendSync('pt:get-path-sync', 'home')
  },

  getLogDirty() {
  return ipcRenderer.sendSync('pt:get-path-sync', 'logs')
  },

  getAppPath() {
  return ipcRenderer.sendSync('pt:get-app-path-sync')
  },

  openPath(url: string) {
  return shell.openPath(url)
  },

  showItemInFolder(url: string) {
  return shell.showItemInFolder(url)
  },

  getVersion() {
  return version
  },

  getPortable() {
  return portable
  },

  getWebLink() {
  return weblink
  },

  createHsIPC(unix_file: string) {
  return createConnect(unix_file)
  },

  captureStart() {
  return start_capture()
  },

  captureStop() {
  return stop_capture()
  },

  getostype() {
  return os.type()
  },

  getPathForFile(file: File) {
  try {
    return webUtils.getPathForFile(file)
  } catch {
    return (file as any).path || ''
  }
  },

  getTempPath() {
  return ipcRenderer.sendSync('pt:get-temp-path-sync')
  },

  watchFile(watchId: string, filePath: string, callback: (watchId: string) => void) {
  ipcRenderer.send('pt:watch-file', watchId, filePath)
  const handler = (_e: any, changedWatchId: string) => {
    if (changedWatchId === watchId) {
    callback(changedWatchId)
    }
  }
  ipcRenderer.on('pt:file-changed', handler);
  (this as any)._watchFileHandlers = (this as any)._watchFileHandlers || {};
  (this as any)._watchFileHandlers[watchId] = handler
  },

  stopWatchFile(watchId: string) {
  ipcRenderer.send('pt:stop-watch-file', watchId)
  const handlers = (this as any)._watchFileHandlers
  if (handlers && handlers[watchId]) {
    ipcRenderer.removeListener('pt:file-changed', handlers[watchId])
    delete handlers[watchId]
  }
  },

  generateSshKey(opts: { type: string, name: string, passphrase?: string, bits?: number }): Promise<any> {
  return ipcRenderer.invoke('pt:ssh-generate-key', opts)
  },

  listSshKeys(): Promise<any[]> {
  return ipcRenderer.invoke('pt:ssh-list-keys')
  },

  deleteSshKey(keyName: string): Promise<boolean> {
  return ipcRenderer.invoke('pt:ssh-delete-key', keyName)
  },

  readSshPublicKey(keyName: string): Promise<string> {
  return ipcRenderer.invoke('pt:ssh-read-public-key', keyName)
  },

  readSshPrivateKey(keyName: string): Promise<string> {
  return ipcRenderer.invoke('pt:ssh-read-private-key', keyName)
  }
}

async function initializeCoreService() {
  const coreService = powertools.getService('powershell-core');
  (powertools as any).coreService = coreService
  let viewManagerChannel = coreService.createChannel()
  await coreService.registerWindowProvider(viewManagerChannel.channelId)
  viewManagerChannel.on('data', ({ reqId }: { reqId: number }) => {
  })
}

(window as any).powertools = powertools;
(window as any).WebSocket = WebSocket
