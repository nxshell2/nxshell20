import type { LayoutModeType } from '@/store/modules/app-setting'

import { createPinia } from 'pinia'
import useSettingStore from '@/store/modules/app-setting'
import useSessionStore from '@/store/modules/session'
import useMenuStore from './modules/nx-menu'
import useNxTabsStore from './modules/nx-tabs'

const pinia = createPinia()

export { type LayoutModeType, useMenuStore, useNxTabsStore, useSessionStore, useSettingStore }
export default pinia
