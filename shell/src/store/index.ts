import { createPinia } from "pinia"

import useSettingStore, { LayoutModeType } from "@/store/modules/app-setting"
import useSessionStore from "@/store/modules/session"
import useNxTabsStore from "./modules/nx-tabs"
import useMenuStore from "./modules/nx-menu"

const pinia = createPinia()

export { useSettingStore, useSessionStore, type LayoutModeType, useNxTabsStore, useMenuStore }
export default pinia
