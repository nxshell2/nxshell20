import { createPinia } from "pinia"

import useSettingStore, { LayoutModeType } from "@/store/modules/app-setting"
import useSessionStore from "@/store/modules/session"
import useNxTabsStore from "./modules/nx-tabs"
import useMenuStore from "./modules/nx-menu"
import useTransferStore from "./modules/transfer"

const pinia = createPinia()

export { useSettingStore, useSessionStore, type LayoutModeType, useNxTabsStore, useMenuStore, useTransferStore }
export default pinia
