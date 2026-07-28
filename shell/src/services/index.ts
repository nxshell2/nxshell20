import "./shellSession"
import "./serialportSession"
import "./sftpSession"
import "./editorSession"
import "./ftpSession"
import "./webdavSession"
import "./welcomeSession"
import "./loginSession"
import "./telnetSession"
import "./localshellSession"
import "./vncSession"
import "./globalSettingSession"

import sessionManager from "./sessionMgr"
import { loadGlobalProfile, reloadGlobalProfile, getProfile } from "./globalSetting"

export default {
	install(app: any) {
		app.config.globalProperties.$sessionManager = sessionManager
	},

	async initService() {
		/** 初始化Session数据 */
		await loadGlobalProfile()
		let configs = getProfile("xterm")
		if (configs && configs.nxconfig) {
			await sessionManager.setConfigPath(String(configs.nxconfig))
			// load again from new path
			await reloadGlobalProfile()
		}
		await sessionManager.loadSessionConfigs()
	}
}
