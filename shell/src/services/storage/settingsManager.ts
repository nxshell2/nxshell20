/**
 * SettingsManager
 *
 * 管理全局 settings.json 文件，存储终端默认配置、locale 等全局设置。
 * session 中的 terminal 字段优先级更高，未设置时回退到 settings.json 中的全局配置。
 */
import path from "path";
import Storage from "./index";

const SETTINGS_FILE = "settings.json";

type Profile = Record<string, unknown>;

interface Settings {
    version: number;
    terminal: Profile;
    locale: string;
    keymap: Profile;
    xterm: Profile;
    storage: Profile;
    [key: string]: unknown;
}

const DEFAULT_SETTINGS: Settings = {
    version: 2,
    terminal: {
        fontFamily: "",
        fontSize: 14,
        fontWeight: "normal",
        xtermTheme: "Night_3024",
        cursorBlink: false,
        cursorStyle: "block",
        lineHeight: 1.0,
        letterSpacing: 0,
        charset: "utf-8"
    },
    locale: "zh-CN",
    keymap: {},
    xterm: {},
    storage: {}
};

let currentSettings: Settings | null = null;

/**
 * 加载 settings.json
 */
async function loadSettings(): Promise<Settings> {
    if (currentSettings) {
        return currentSettings;
    }
    const localStorage = Storage.localStorage;
    const settingsPath = path.join(localStorage.getAppDataDirty(), SETTINGS_FILE);
    let settings: Settings = { ...DEFAULT_SETTINGS };
    try {
        const raw = await localStorage.readFile(settingsPath);
        if (raw) {
            const parsed = JSON.parse(raw) as Settings;
            settings = {
                ...DEFAULT_SETTINGS,
                ...parsed,
                terminal: {
                    ...DEFAULT_SETTINGS.terminal,
                    ...(parsed.terminal || {})
                },
                xterm: {
                    ...(parsed.xterm || {})
                },
                storage: {
                    ...(parsed.storage || {})
                }
            };
        }
    } catch (e: unknown) {
        console.warn("[SettingsManager] Failed to load settings.json, using defaults:", (e as Error).message);
    }
    currentSettings = settings;
    await saveSettings(settings);
    return settings;
}

/**
 * 保存 settings.json
 */
async function saveSettings(settings?: Settings): Promise<void> {
    const data = settings || currentSettings || DEFAULT_SETTINGS;
    currentSettings = data;
    const localStorage = Storage.localStorage;
    const settingsPath = path.join(localStorage.getAppDataDirty(), SETTINGS_FILE);
    try {
        await localStorage.writeFile(settingsPath, JSON.stringify(data, null, 2));
    } catch (e: unknown) {
        console.warn("[SettingsManager] Failed to save settings.json:", (e as Error).message);
    }
}

/**
 * 获取全局终端配置
 */
async function getTerminalSettings(): Promise<Profile> {
    const settings = await loadSettings();
    return settings.terminal || {};
}

/**
 * 更新全局终端配置
 */
async function updateTerminalSettings(terminal: Partial<Profile>): Promise<void> {
    const settings = await loadSettings();
    settings.terminal = { ...settings.terminal, ...terminal };
    await saveSettings(settings);
}

/**
 * 获取 locale
 */
async function getLocale(): Promise<string> {
    const settings = await loadSettings();
    return settings.locale || "zh-CN";
}

/**
 * 更新 locale
 */
async function setLocale(locale: string): Promise<void> {
    const settings = await loadSettings();
    settings.locale = locale;
    await saveSettings(settings);
}

async function reloadSettings(): Promise<Settings> {
    currentSettings = null;
    return await loadSettings();
}

function getProfile(categoryName: string): Profile | null {
    if (!currentSettings) {
        return null;
    }
    const profile = currentSettings[categoryName];
    return (typeof profile === "object" && profile !== null) ? profile as Profile : null;
}

async function setProfile(categoryName: string, profile: Profile): Promise<void> {
    const settings = await loadSettings();
    settings[categoryName] = profile;
    if (categoryName === "xterm") {
        settings.terminal = { ...settings.terminal, ...profile };
    }
    await saveSettings(settings);
}

async function updateProfile(categoryName: string, profile: Partial<Profile>): Promise<void> {
    const settings = await loadSettings();
    const old = settings[categoryName] as Profile || {};
    for (const key in profile) {
        if (Object.prototype.hasOwnProperty.call(profile, key)) {
            old[key] = profile[key];
        }
    }
    settings[categoryName] = old;
    if (categoryName === "xterm") {
        settings.terminal = { ...settings.terminal, ...old };
    }
    await saveSettings(settings);
}

export {
    loadSettings,
    reloadSettings,
    saveSettings,
    getTerminalSettings,
    updateTerminalSettings,
    getLocale,
    setLocale,
    getProfile,
    setProfile,
    updateProfile,
    DEFAULT_SETTINGS
};
