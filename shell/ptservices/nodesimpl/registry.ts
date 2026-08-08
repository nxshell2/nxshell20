import { PROTOCOLS } from '../../common/nxsys/consts'

const nodeImplRegistry: any = Object.create(null)

function register(nodeProtocol: string, nodeImplClass: any): void {
  const protocol = nodeProtocol.toUpperCase()
  if (!(protocol in PROTOCOLS)) {
  throw new Error(`Unimplementd protocol: ${nodeProtocol}`)
  }
  nodeImplRegistry[protocol] = nodeImplClass
}

function getNodeClassByProtocol(nodeProtocol: string): any {
  const protocol = nodeProtocol.toUpperCase()
  return nodeImplRegistry[protocol]
}

export {
  getNodeClassByProtocol,
  register
}
