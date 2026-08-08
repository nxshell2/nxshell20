function parseLines(stdout) {
  return stdout.trim().split('\n').filter(l => l.trim())
}

export function parseOsRelease(stdout) {
  const info = {}
  for (const line of parseLines(stdout)) {
  const idx = line.indexOf('=')
  if (idx > 0) {
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim().replace(/^"|"$/g, '')
    info[key] = val
  }
  }
  return {
  os: info.PRETTY_NAME || info.NAME || '',
  version: info.VERSION_ID || info.VERSION || '',
  id: info.ID || ''
  }
}

export function parseUname(stdout) {
  const parts = stdout.trim().split(/\s+/)
  return {
  kernel: parts[0] || '',
  hostname: parts[1] || '',
  kernelRelease: parts[2] || '',
  kernelVersion: parts[3] || '',
  arch: parts[parts.length - 1] || ''
  }
}

export function parseUptime(stdout) {
  const text = stdout.trim()
  const loadMatch = text.match(/load averages?:\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/i)
  const upMatch = text.match(/up\s+([\d:]+|\d+\s+\w+),/)
  return {
  loadAvg1: loadMatch ? Number.parseFloat(loadMatch[1]) : 0,
  loadAvg5: loadMatch ? Number.parseFloat(loadMatch[2]) : 0,
  loadAvg15: loadMatch ? Number.parseFloat(loadMatch[3]) : 0,
  uptime: upMatch ? upMatch[1] : ''
  }
}

export function parseCpuInfo(stdout) {
  const info = {
  modelName: '',
  cores: 0,
  sockets: 0,
  mhz: ''
  }
  let processorCount = 0
  const physicalIds = new Set()
  for (const line of parseLines(stdout)) {
  if (line.startsWith('model name')) {
    info.modelName = line.split(':')[1]?.trim() || info.modelName
  } else if (line.startsWith('processor')) {
    processorCount++
  } else if (line.startsWith('physical id')) {
    physicalIds.add(line.split(':')[1]?.trim())
  } else if (line.startsWith('cpu MHz')) {
    info.mhz = line.split(':')[1]?.trim() || info.mhz
  }
  }
  info.cores = processorCount
  info.sockets = physicalIds.size || 1
  return info
}

export function parseMemInfo(stdout) {
  const info = {
  total: 0,
  free: 0,
  available: 0,
  buffers: 0,
  cached: 0,
  swapTotal: 0,
  swapFree: 0
  }
  for (const line of parseLines(stdout)) {
  const parts = line.split(':')
  if (parts.length < 2) {
    continue
  }
  const key = parts[0].trim()
  const val = parseInt(parts[1].trim()) * 1024
  if (key === 'MemTotal') {
    info.total = val
  } else if (key === 'MemFree') {
    info.free = val
  } else if (key === 'MemAvailable') {
    info.available = val
  } else if (key === 'Buffers') {
    info.buffers = val
  } else if (key === 'Cached') {
    info.cached = val
  } else if (key === 'SwapTotal') {
    info.swapTotal = val
  } else if (key === 'SwapFree') {
    info.swapFree = val
  }
  }
  info.used = info.total - info.available
  info.usagePercent = info.total > 0 ? Math.round(info.used / info.total * 100) : 0
  return info
}

export function parseDf(stdout) {
  const lines = parseLines(stdout)
  if (lines.length < 2) {
  return []
  }
  const header = lines[0].split(/\s+/)
  const hasType = header.includes('Type') || header.includes('type')
  const partitions = []
  for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(/\s+/)
  if (hasType && cols.length >= 7) {
    partitions.push({
    filesystem: cols[0],
    type: cols[1],
    total: cols[2],
    used: cols[3],
    available: cols[4],
    usagePercent: cols[5],
    mountedOn: cols[6]
    })
  } else if (!hasType && cols.length >= 6) {
    partitions.push({
    filesystem: cols[0],
    type: '',
    total: cols[1],
    used: cols[2],
    available: cols[3],
    usagePercent: cols[4],
    mountedOn: cols[5]
    })
  }
  }
  return partitions
}

export function parseIpAddr(stdout) {
  const map = new Map()
  function getOrCreate(name) {
  if (!map.has(name)) {
    map.set(name, { name, ipv4: [], ipv6: [], state: '' })
  }
  return map.get(name)
  }

  for (const line of parseLines(stdout)) {
  // ip -o addr show: "2: eth0    inet 172.20.30.49/20 brd ... scope global eth0"
  const ipMatch = line.match(/^\d+:\s+(\S+)\s+(inet6?)\s+(\S+)/)
  if (ipMatch) {
    const iface = getOrCreate(ipMatch[1])
    const ip = ipMatch[3].split('/')[0]
    if (ipMatch[2] === 'inet' && !iface.ipv4.includes(ip)) {
    iface.ipv4.push(ip)
    } else if (ipMatch[2] === 'inet6' && !iface.ipv6.includes(ip)) {
    iface.ipv6.push(ip)
    }
    continue
  }

  // ip -o link show: "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP mode ..."
  const linkMatch = line.match(/^\d+:\s+(\S+):\s+<([^>]+)>(?:\s+\S.*(?:[\n\r\u2028\u2029]\s*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF])|\s{2,})state\s+(\S+)/)
  if (linkMatch) {
    const iface = getOrCreate(linkMatch[1])
    const flags = linkMatch[2]
    const linkState = linkMatch[3]
    // Use operational flags when state is UNKNOWN (common for lo)
    if (flags.includes('UP') || flags.includes('LOWER_UP')) {
    iface.state = 'UP'
    } else if (flags.includes('DOWN')) {
    iface.state = 'DOWN'
    } else {
    iface.state = linkState
    }
    continue
  }

  // ifconfig (legacy): "eth0: flags=... mtu ..."
  const ifconfigMatch = line.match(/^([\w.-]+):\s+flags=/)
  if (ifconfigMatch) {
    const stateFlags = line.match(/<.*(UP|DOWN).*>/)
    const iface = getOrCreate(ifconfigMatch[1])
    if (stateFlags) {
    iface.state = stateFlags[1]
    }
    continue
  }

  // ifconfig: "        inet 172.20.30.49  netmask ..."
  const ifcInetMatch = line.match(/^\s+inet\s+(\S+)/)
  if (ifcInetMatch) {
    const ip = ifcInetMatch[1]
    // assign to the last known interface
    const last = Array.from(map.values()).pop()
    if (last && !last.ipv4.includes(ip)) {
    last.ipv4.push(ip)
    }
    continue
  }

  // ifconfig: "        inet6 fe80::...  prefixlen ..."
  const ifcInet6Match = line.match(/^\s+inet6\s+(\S+)/)
  if (ifcInet6Match) {
    const ip = ifcInet6Match[1]
    const last = Array.from(map.values()).pop()
    if (last && !last.ipv6.includes(ip)) {
    last.ipv6.push(ip)
    }
  }
  }

  return Array.from(map.values())
}

export function parseNetDev(stdout) {
  const interfaces = []
  const lines = parseLines(stdout)
  if (lines.length < 3) {
  return []
  }
  for (let i = 2; i < lines.length; i++) {
  const line = lines[i]
  const colonIdx = line.indexOf(':')
  if (colonIdx < 0) {
    continue
  }
  const name = line.slice(0, colonIdx).trim()
  const stats = line.slice(colonIdx + 1).trim().split(/\s+/)
  if (stats.length < 16) {
    continue
  }
  interfaces.push({
    name,
    rxBytes: parseInt(stats[0]) || 0,
    rxPackets: parseInt(stats[1]) || 0,
    txBytes: parseInt(stats[8]) || 0,
    txPackets: parseInt(stats[9]) || 0
  })
  }
  return interfaces
}

export function formatBytes(bytes) {
  if (bytes === 0) {
  return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`
}

export function parseProcesses(stdout) {
  const lines = parseLines(stdout)
  if (lines.length < 2) {
  return []
  }
  const processes = []
  for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim()
  if (!line) {
    continue
  }
  // ps -eo pid,ppid,user,pcpu,pmem,etime,comm,args
  const cols = line.split(/\s+/)
  if (cols.length < 8) {
    continue
  }
  const [pid, ppid, user, cpu, mem, elapsed, comm, ...argsArr] = cols
  processes.push({
    pid,
    ppid,
    user,
    cpu: Number.parseFloat(cpu) || 0,
    mem: Number.parseFloat(mem) || 0,
    elapsed,
    comm,
    args: argsArr.join(' ') || comm
  })
  }
  return processes
}

export function parseServices(stdout) {
  const services = []
  const esc = String.fromCharCode(27)
  const ansiPattern = new RegExp(`${esc}\\[[0-9;]*m`, 'g')
  for (const rawLine of parseLines(stdout)) {
  // Strip ANSI color codes and bullet characters
  const line = rawLine.replace(ansiPattern, '').replace(/^\s*[●*•]\s*/, '').trim()
  if (!line) {
    continue
  }

  // service --status-all format: " [ + ]  cron" or " [ - ]  dbus"
  const serviceMatch = line.match(/^\[\s*([+\-?])\s*\]\s+(\S+)/)
  if (serviceMatch) {
    const flag = serviceMatch[1]
    const state = flag === '+' ? 'running' : flag === '-' ? 'stopped' : 'unknown'
    services.push({
    name: serviceMatch[2],
    state,
    status: flag === '+' ? 'active' : 'inactive',
    description: ''
    })
    continue
  }

  // systemctl list-units --type=service --no-pager --no-legend
  // ssh.service loaded active running OpenSSH server daemon
  const cols = line.split(/\s+/)
  if (cols.length < 4) {
    continue
  }
  const [name, , active, sub, ...desc] = cols
  services.push({
    name,
    state: sub || active,
    status: active,
    description: desc.join(' ')
  })
  }
  return services
}
