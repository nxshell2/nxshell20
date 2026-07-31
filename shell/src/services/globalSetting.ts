import Storage from "./storage"
import {
	loadSettings,
	reloadSettings,
	saveSettings,
	getProfile as _getProfile,
	setProfile as _setProfile,
	updateProfile as _updateProfile
} from "./storage/settingsManager"

type GlobalCategoryType = "xterm" | "storage"

interface IProfile {
	[propName: string]: unknown
}

async function migrateFromLegacy(): Promise<void> {
	const settings = await loadSettings()
	if (settings.version >= 2 && settings.xterm && Object.keys(settings.xterm).length > 0) {
		return
	}

	try {
		// 从旧路径读取加密的 __GLOBAL_PROFILE__
		const localStorage = Storage.localStorage
		const legacyProfile = (await localStorage.readLegacy("GLOBAL_PROFILE")) as IProfile | null
		if (legacyProfile) {
			const xterm = legacyProfile["xterm"] as IProfile | undefined
			if (xterm) {
				settings.xterm = { ...(settings.xterm || {}), ...xterm }
				settings.terminal = { ...settings.terminal, ...xterm }
			}
			const storage = legacyProfile["storage"] as IProfile | undefined
			if (storage) {
				settings.storage = { ...(settings.storage || {}), ...storage }
			}
			settings.version = 2
			await saveSettings(settings)
			console.log("[globalSetting] Migrated legacy __GLOBAL_PROFILE__ to settings.json")
		}
	} catch (e: unknown) {
		console.warn("[globalSetting] Legacy migration skipped:", e)
	}
}

export async function loadGlobalProfile(): Promise<void> {
	await loadSettings()
	await migrateFromLegacy()
}

export async function reloadGlobalProfile(): Promise<void> {
	await reloadSettings()
}

export function getProfile(categoryName: GlobalCategoryType): IProfile | null {
	return _getProfile(categoryName) as IProfile | null
}

export async function setProfile(categoryName: GlobalCategoryType, profile: IProfile): Promise<void> {
	await _setProfile(categoryName, profile)
}

export async function updateProfile(categoryName: GlobalCategoryType, profile: IProfile): Promise<void> {
	await _updateProfile(categoryName, profile)
}
