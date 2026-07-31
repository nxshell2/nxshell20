import { createI18n } from "vue-i18n"
import zh from "./lang/zh-CN.json"
import en from "./lang/en-US.json"
import { getProfile, loadGlobalProfile } from "@/services/globalSetting"

let i18nInstance = null

async function initI18n() {
	if (i18nInstance) {
		return i18nInstance
	}
	let settings = getProfile("xterm")
	if (settings === null) {
		await loadGlobalProfile()
		settings = getProfile("xterm")
	}
	const language = settings?.language ?? "zh-CN"
	// 创建vue-i18n实例i18n
	i18nInstance = createI18n({
		legacy: false,
		locale: language,
		globalInjection: true,
		missingWarn: false,
		fallbackWarn: false,
		datetimeFormats: {
			"zh-CN": {
				short: {
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
					hour: "2-digit",
					minute: "2-digit"
				},
				long: {
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
					hour: "2-digit",
					minute: "2-digit"
				}
			},
			"en-US": {
				short: {
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
					hour: "2-digit",
					minute: "2-digit"
				},
				long: {
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
					hour: "2-digit",
					minute: "2-digit"
				}
			}
		},
		messages: {
			"zh-CN": zh,
			"en-US": en
		}
	})
	return i18nInstance
}

export function getI18n() {
	return i18nInstance
}

export default initI18n
