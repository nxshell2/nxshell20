#!/usr/bin/env node
const { spawn } = require('node:child_process')
const http = require('node:http')
const path = require('node:path')
const readline = require('node:readline')

// Node 17+ OpenSSL 3 breaks webpack 5's internal MD4 hashing, so webpack-based
// processes (vue-cli-service, devtools/buildservice) need --openssl-legacy-provider.
// But Electron rejects that flag in NODE_OPTIONS, so env must be split per target.
const LEGACY_FLAG = '--openssl-legacy-provider'

function envForWebpack() {
  const opts = (process.env.NODE_OPTIONS || '').split(/\s+/).filter(Boolean)
  if (!opts.includes(LEGACY_FLAG)) opts.push(LEGACY_FLAG)
  return { ...process.env, NODE_OPTIONS: opts.join(' ') }
}

function envForElectron() {
  const opts = (process.env.NODE_OPTIONS || '').split(/\s+/).filter(x => x && x !== LEGACY_FLAG)
  const env = { ...process.env }
  if (opts.length) env.NODE_OPTIONS = opts.join(' ')
  else delete env.NODE_OPTIONS
  return env
}

const root = path.resolve(__dirname, '..')
const shellDir = path.join(root, 'shell')
const shellPackage = require(path.join(shellDir, 'package.json'))
const coreDir = path.join(root, 'core')
const ptservicesDir = path.join(shellDir, 'ptservices')

const ptservicesBuildDir = path.join(shellDir, 'devtools', 'webpack', 'dist')
const ptservicesOutput = path.join(ptservicesBuildDir, 'index.js')

const injectAppPackage = {
  name: 'powertools-shell',
  version: shellPackage.version,
  main: ptservicesOutput,
  resources: {
  icon: '',
  path: ptservicesDir,
  index: 'http://localhost:8080'
  },
  start: {
  view: 'mainWindow',
  viewFlags: ['frameless', 'hidden']
  }
}

const children = []

function prefixOutput(child, prefix) {
  const out = readline.createInterface({ input: child.stdout })
  const err = readline.createInterface({ input: child.stderr })
  out.on('line', line => console.log(`[${prefix}] ${line}`))
  err.on('line', line => console.error(`[${prefix}] ${line}`))
}

function killTree(child) {
  if (!child || child.killed || child.exitCode !== null) {
  return
  }
  try {
  process.kill(-child.pid, 'SIGTERM')
  } catch(e) {
  try {
    child.kill('SIGTERM')
  } catch(_) {}
  }
  setTimeout(() => {
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch(e) {
    try {
    child.kill('SIGKILL')
    } catch(_) {}
  }
  }, 5000)
}

function cleanup(code = 0) {
  if (children.length === 0) {
  return
  }
  console.log('\nStopping dev processes...')
  children.forEach(killTree)
  setTimeout(() => process.exit(code), 6000)
}

process.on('SIGINT', () => cleanup(0))
process.on('SIGTERM', () => cleanup(0))

function waitForServer(url, timeout = 60000) {
  return new Promise((resolve, reject) => {
  const start = Date.now()
  const timer = setInterval(() => {
    const req = http.get(url, (res) => {
    res.resume()
    if (res.statusCode && res.statusCode < 500) {
      clearInterval(timer)
      resolve()
    }
    })
    req.on('error', () => {
    if (Date.now() - start > timeout) {
      clearInterval(timer)
      reject(new Error(`Timeout waiting for shell dev server at ${url}`))
    }
    })
  }, 500)
  })
}

function runCommand(name, cmd, args, cwd, env = process.env) {
  const child = spawn(cmd, args, {
  cwd,
  env,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
  })
  children.push(child)
  prefixOutput(child, name)
  child.on('exit', (code) => {
  console.log(`[${name}] exited with code ${code}`)
  cleanup(code || 0)
  })
  return child
}

function runBuild(name, cmd, args, cwd, env = process.env) {
  const child = spawn(cmd, args, {
  cwd,
  env,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
  })
  prefixOutput(child, name)
  return child
}

function waitForChild(child) {
  return new Promise((resolve, reject) => {
  child.on('exit', (code) => {
    if (code === 0) {
    resolve()
    } else {
    reject(new Error(`${child.spawnargs.join(' ')} exited with code ${code}`))
    }
  })
  })
}

console.log('Building ptservices...')
const buildChild = runBuild('ptservices-build', 'node', ['devtools/buildservice.js'], shellDir, envForWebpack())
const buildPromise = waitForChild(buildChild)

runCommand('shell', 'npm', ['run', 'serve'], shellDir, envForWebpack())

Promise.all([buildPromise, waitForServer('http://localhost:8080')])
  .then(() => {
  console.log('Shell dev server ready, starting core...')
  const env = {
    ...envForElectron(),
    POWERTOOLS_DEV_PACKAGE: JSON.stringify(injectAppPackage)
  }
  runCommand('core', 'npm', ['run', 'dev'], coreDir, env)
  })
  .catch((err) => {
  console.error(err.message)
  cleanup(1)
  })
