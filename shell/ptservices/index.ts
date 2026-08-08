import * as util from 'node:util'

import { createDataTransfer } from './dataTransfer'
import { getSystemFonts } from './fontList'
import { createFileStorage } from './localFileStorage'
import { createLogger } from './logger'
import { createNodeSessionInstance, getNodeSessionInstanceByUUID } from './nodes'
import { getSerialPorts } from './nodesimpl/serialportnodes'
import { callObject, closeObject } from './nxobjs'
import { createStandaloneSFTP } from './standaloneSftp'

if (typeof (util as any).isDate !== 'function') {
  (util as any).isDate = (val: any) => val instanceof Date
}

declare const powertools: any

powertools.createHsIPCServer()

export default {
  add(v1: number, v2: number): number {
  return v1 + v2
  },
  callObject,
  closeObject,
  createNodeSessionInstance,
  getNodeSessionInstanceByUUID,
  createDataTransfer,
  createFileStorage,
  getSerialPorts,
  createLogger,
  getSystemFonts,
  createStandaloneSFTP,
  getHsIPCHandle: () => {
  return powertools.getHsIPCConnectFile()
  }
}
