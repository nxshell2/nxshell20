import { shell } from 'electron'
import * as semver from 'semver'
import { pull_app_version } from '../utils/collect'
import { version } from '../version'
import * as CoreUI from './CoreUI'

export async function check_app_update() {
  let s_version: string | false | null = null
  try {
  s_version = await pull_app_version()
  } catch(e) {
  console.error(e)
  return
  }
  if (!s_version) {
  return
  }
  if (!semver.gt(s_version, version)) {
  return
  }
  setTimeout(
  async() => {
    const res = await CoreUI.showMessageBox({
    title: 'NxShell',
    type: 'info',
    message: `Please update current version: ${version} to latest version: ${s_version} !`,
    buttons: ['Skip', 'Upgrade']
    })
    if (res.response === 1) {
    shell.openExternal('https://nxshell.github.io')
    }
  },
  1000 * 10
  )
}
