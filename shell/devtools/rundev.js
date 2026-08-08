/**
 * 执行开发环境
 *
 * 设置NODE_ENV为development
 * 设置其他环境变量：
 *     启动页地址：POWERTOOLS_DEV_START_URL
 *     设置服务路径：POWERTOOLS_DEV_SERVICE_PATH
 */
const { exec } = require('node:child_process')
const path = require('node:path')

const injectAppPackage = {
  name: 'powertools-shell',
  version: require('../package.json').version,
  main: path.join(__dirname, '../ptservices', 'index.js'),
  resources: {
    icon: '',
    path: path.join(__dirname, '../ptservices'),
    index: 'http://localhost:8080'
  },
  start: {
    view: 'mainWindow',
    viewFlags: ['frameless', 'hidden']
  }
}

process.chdir(path.join(__dirname, '..', '..', 'core'))
console.info('current dir:', process.cwd())
const npmCmd = exec('npm run dev', {
  env: {
    ...process.env,
    POWERTOOLS_DEV_PACKAGE: JSON.stringify(injectAppPackage)
  }
})

npmCmd.stdout.on('data', (data) => {
  process.stdout.write(data)
})

npmCmd.stderr.on('data', (data) => {
  process.stderr.write(data)
})

npmCmd.on('error', (err) => {
  console.error(err.message)
})
