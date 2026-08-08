<script setup>
import { storeToRefs } from 'pinia'
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NxNavbar, NxToolbar } from '@/layout/components'
import * as EventBus from '@/services/eventbus'
import { useSettingStore } from '@/store'

const { t } = useI18n()
const IS_MAC_OS = /macintosh/i.test(navigator.userAgent)

const isMainWindow = ref(true)
const leftPanelWidth = ref(IS_MAC_OS ? 70 : 50)
const leftPanel = ref(true)
const topPanel = ref(true)
const state = ref('normal')
const active = ref(true)
const showLayout = ref(false)
const settingStore = useSettingStore()
const { layoutMode } = storeToRefs(settingStore)

const main_container_fix_style = computed(() => topPanel.value ? {} : { height: '100%' })

function setWindowHandlers() {
  powertools.onWindowEvent('blur', () => {
    active.value = false
  })

  powertools.onWindowEvent('focus', () => {
    active.value = true
  })

  powertools.onWindowEvent('maximize', () => {
    state.value = 'maximize'
  })

  powertools.onWindowEvent('unmaximize', () => {
    state.value = 'normal'
  })
}

function workaroundLinuxMaxMinEvent(status) {
  // electron version < 17.xx ,it not emit maximize/unmaximize events
  const os = powertools.getostype()
  if (os === 'Linux') {
    state.value = status
  }
}

function doMinimize() {
  powertools.minimizeWindow()
  workaroundLinuxMaxMinEvent('normal')
}

function doMaximize() {
  if (state.value === 'normal') {
    powertools.maximizeWindow()
    workaroundLinuxMaxMinEvent('maximize')
  } else {
    powertools.unmaximizeWindow()
    workaroundLinuxMaxMinEvent('normal')
  }
}

function doClose() {
  powertools.closeWindow()
}

function changeLayout(event) {
  const element = event.currentTarget
  const layout = element.getAttribute('data-layout')
  settingStore.updateLayoutMode(layout)
}

const proxy = getCurrentInstance()?.proxy
const { configPanel } = storeToRefs(useSettingStore())
const mainPanelWidth = computed(() => {
  return leftPanel.value ? `calc(100% - ${leftPanelWidth.value}px)` : '100%'
})
onMounted(() => {
  setWindowHandlers()
  // 检测是否需要显示会话布局
  const sessionManager = proxy?.$sessionManager
  const updateShowLayout = () => {
    const sessions = sessionManager?.getSessionIntances() || []
    showLayout.value = sessions.some(x => x.type === 'shell')
  }
  updateShowLayout()
  EventBus.subscript('instance-created', updateShowLayout)
  EventBus.subscript('instance-close', updateShowLayout)
  EventBus.subscript('enter-fullscreen', async() => {
    try {
      leftPanel.value = false
      topPanel.value = false
      EventBus.publish('session-config-panel', 'close')
      await document.body.requestFullscreen()
    } catch(e) {
      // pass
      console.error(e)
    }
  })
  document.addEventListener('fullscreenchange', () => {
    const isFullscreen = !!document.fullscreenElement
    if (!isFullscreen) {
      if (configPanel.value) {
        EventBus.publish('session-config-panel', 'open')
      }
      leftPanel.value = true
      topPanel.value = true
    }
  })
})
</script>

<template>
  <div class="pt-window" :class="{ 'not-macos': !IS_MAC_OS }">
    <div v-if="leftPanel" class="left-panel" :style="{ width: `${leftPanelWidth}px` }">
      <NxNavbar />
    </div>
    <div class="main-panel">
      <div class="title-bar" :class="{ drag: isMainWindow, deactive: !active }">
        <!-- 顶部工具栏 -->
        <NxToolbar />
        <!-- 右侧开关 -->
        <div class="window-controls-container">
          <div v-if="showLayout" class="n-layout-wrapper">
            <el-tooltip class="item" effect="dark" :content="t('home.session-instance.context-menu.split-normal')" placement="top-start">
              <span class="n-layout-button" :class="{ 'is-active': layoutMode === 'normal' }" data-layout="normal" @click="changeLayout">
                <svg class="layout-icon" viewBox="0 0 16 16" width="1em" height="1em">
                  <rect
                    x="1.5"
                    y="2.5"
                    width="13"
                    height="11"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                </svg>
              </span>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :content="t('home.session-instance.context-menu.split-row')" placement="top-start">
              <span class="n-layout-button" :class="{ 'is-active': layoutMode === 'row' }" data-layout="row" @click="changeLayout">
                <svg class="layout-icon" viewBox="0 0 16 16" width="1em" height="1em">
                  <rect
                    x="1.5"
                    y="2.5"
                    width="6"
                    height="11"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                  <rect
                    x="8.5"
                    y="2.5"
                    width="6"
                    height="11"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                </svg>
              </span>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :content="t('home.session-instance.context-menu.split-column')" placement="top-start">
              <span class="n-layout-button" :class="{ 'is-active': layoutMode === 'col' }" data-layout="col" @click="changeLayout">
                <svg class="layout-icon" viewBox="0 0 16 16" width="1em" height="1em">
                  <rect
                    x="1.5"
                    y="2.5"
                    width="13"
                    height="4.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                  <rect
                    x="1.5"
                    y="9"
                    width="13"
                    height="4.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                </svg>
              </span>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :content="t('home.session-instance.context-menu.split-grid')" placement="top-start">
              <span class="n-layout-button" :class="{ 'is-active': layoutMode === 'grid' }" data-layout="grid" @click="changeLayout">
                <svg class="layout-icon" viewBox="0 0 16 16" width="1em" height="1em">
                  <rect
                    x="1.5"
                    y="2.5"
                    width="5.5"
                    height="5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                  <rect
                    x="9"
                    y="2.5"
                    width="5.5"
                    height="5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                  <rect
                    x="1.5"
                    y="8.5"
                    width="5.5"
                    height="5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                  <rect
                    x="9"
                    y="8.5"
                    width="5.5"
                    height="5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                </svg>
              </span>
            </el-tooltip>
          </div>
          <n-space v-if="!IS_MAC_OS" :size="14">
            <span class="control-btn" @click="doMinimize">
              <Minus />
            </span>
            <span class="control-btn" @click="doMaximize">
              <FullScreen v-if="state !== 'normal'" /><CopyDocument v-else />
            </span>
            <span class="control-btn" @click="doClose">
              <Close />
            </span>
          </n-space>
        </div>
      </div>
      <div class="main-container" :style="main_container_fix_style">
        <slot name="main-panel" />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use '@/assets/scss/_const.scss' as *;

.pt-window {
  display: flex;
  position: relative;
  box-sizing: border-box;

  width: 100%;
  height: 100%;
  min-width: 1000px;

  .left-panel {
    height: 100%;
    background-color: var(--n-bg-color-base);
    backdrop-filter: blur(5px);
  }

  .main-panel {
    width: v-bind(mainPanelWidth);
    height: 100%;

    .title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 40px;
      width: 100%;
      background-color: var(--n-bg-color-base);
      backdrop-filter: blur(5px);

      &.drag {
        -webkit-app-region: drag;
      }

      .title-bar-search {
        width: 270px;
        z-index: 3000;
        -webkit-app-region: no-drag;
      }

      .window-controls-container {
        display: flex;
        flex-grow: 0;
        flex-shrink: 0;
        padding: 0 10px;
        -webkit-app-region: no-drag;

        .n-layout-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .n-layout-button {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            color: var(--n-text-color-base);
            padding: 5px;
            border-radius: 4px;
            font-size: 16px;

            &:hover {
              background-color: var(--n-hover-bg-color);
            }

            &:not(:last-child) {
              margin-right: 4px;
            }

            .layout-icon {
              width: 1em;
              height: 1em;
            }
          }

          .is-active {
            background-color: var(--n-hover-bg-color);
            color: var(--n-text-color-active);
          }
        }

        .control-btn {
          display: inline-block;
          width: 32px;
          height: 32px;
          line-height: 32px;
          text-align: center;
          color: var(--n-text-color-base);

          &:hover {
            cursor: pointer;
            color: var(--n-text-color-light);
            background-color: var(--n-hover-bg-color);
          }
        }
      }
    }

    .main-container {
      position: relative;
      box-sizing: border-box;
      width: 100%;
      height: calc(100% - #{$titleBarHeight});
    }
  }
}
</style>
