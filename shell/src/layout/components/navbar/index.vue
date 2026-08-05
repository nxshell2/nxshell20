<script setup>
import axios from 'axios'
import { storeToRefs } from 'pinia'
import semver from 'semver'
import { getCurrentInstance, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getProfile, updateProfile } from '@/services/globalSetting'
import { createLocalFs } from '@/services/nxsys/localfs'
import { SESSION_TYPES } from '@/services/session'
import { useSettingStore } from '@/store'

const { t, locale } = useI18n()
const IS_MACOS = /macintosh/i.test(navigator.userAgent)
const version = ref('V1.0.0')
const needUpdate = ref(false)
const capture = ref(false)
const captureIcon = ref('')
const fsClient = ref()
const instance = getCurrentInstance()
const settingStore = useSettingStore()
const { theme, userLock } = storeToRefs(settingStore)
const themeIconConstants = {
  light: 'Sunny',
  dark: 'Moon',
  pink: 'Cherry',
  hazy: 'Sunny'
}
console.log('设置', locale.value, getProfile('xterm')?.language)
async function doCapture(_e) {
  capture.value = !capture.value
  captureIcon.value = capture.value ? 'VideoPlay' : 'VideoPause'
  if (capture.value) {
    const save_buffer = await window.powertools.captureStop()
    const coreService = window.powertools.getService('powertools-core')
    const { canceled, filePath } = await coreService.showSaveDialog({
      defaultPath: `nxshell-capture-${Date.now()}.webm`
    })
    if (canceled) {
      return
    }
    if (!fsClient.value) {
      fsClient.value = await createLocalFs()
    }
    const w_handle = await fsClient.value.open(filePath, 'w')
    await fsClient.value.write(w_handle, save_buffer, 0, save_buffer.length, 0)
    fsClient.value.close(w_handle)
    return
  }
  await window.powertools.captureStart()
}

async function checkAppUpdate() {
  const versionUrl = 'http://106.15.238.81:56789/oauth/version'
  try {
    const {
      data: { version: remoteVersion = '' }
    } = await axios.get(versionUrl, { timeout: 10 * 1000 })
    if (remoteVersion !== '' && remoteVersion !== version.value) {
      needUpdate.value = semver.gt(remoteVersion, version.value)
    }
  } catch {
    // 版本检测失败（如网络不可达）时静默降级，不影响正常使用
  }
}

function goLogin() {
  // const { $sessionManager: sessionManager } = instance?.proxy
  // const loginInstances = sessionManager.matchSessionInstanceBySessionType(SESSION_TYPES.LOGIN)
  // if (loginInstances.length) {
  // 	return
  // }
  // sessionManager.createLoginSessionInstance()
}
function toggleTheme(theme) {
  settingStore.changeTheme(theme)
}
function gotoGlobalSetting() {
  if (userLock.value) {
    // not allow
    return
  }
  const proxy = instance?.proxy
  // @ts-ignore
  const sessionManager = proxy && proxy.$sessionManager
  if (!sessionManager) {
    return
  }
  const globalSettingInstances = sessionManager.matchSessionInstanceBySessionType(SESSION_TYPES.GLOBALSETTING)
  if (globalSettingInstances.length) {
    return
  }

  sessionManager.createGlobalSettingSessionInstance()
}
async function handlerVersionUpdate() {
  // 外链打开github地址
  const update = 'https://github.com/nxshell/nxshell/releases'
  await window.powertools.openExterUrl(update)
}

function changeLanguage() {
  const language = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
  updateProfile('xterm', { language })
  // settingStore.changeLanguage()
  locale.value = language
}

onMounted(() => {
  version.value = window.powertools.getVersion()
  checkAppUpdate()
})
</script>

<template>
  <div class="pt-shell-app-nav-bar" :style="{ padding: IS_MACOS ? '38px 10px 10px' : '0 10px 10px' }">
    <!-- Logo -->
    <div class="pt-logo">
      <el-avatar shape="square" fit="fill" size="small" :src="require('@/assets/logo.png')" />
    </div>
    <!-- 用户头像 -->
    <div v-if="false" class="capture" @click.prevent="doCapture">
      <n-icon type="img" :name="captureIcon" size="28" class-name="icon-setting" />
    </div>
    <!-- 设置相关 -->
    <div class="icon-setting-container">
      <n-space vertical align="center">
        <!-- 头像 -->
        <!-- <el-avatar v-show="true" shape="square" fit="fill" :src="avatarUrl" @click="goto_login" /> -->
        <el-button v-if="false" link icon="User" @click="goLogin" />
        <!-- 主题切换按钮 -->
        <el-dropdown trigger="click" placement="bottom-end" @command="toggleTheme">
          <el-button link :icon="themeIconConstants[theme]" />
          <template #dropdown>
            <el-dropdown-menu class="theme-btn">
              <el-dropdown-item :disabled="theme === 'light'" command="light" icon="Sunny">
                {{ t("app.theme.light") }}
              </el-dropdown-item>
              <el-dropdown-item :disabled="theme === 'dark'" command="dark" icon="Moon">
                {{ t("app.theme.dark") }}
              </el-dropdown-item>
              <el-dropdown-item :disabled="theme === 'pink'" command="pink" icon="Cherry">
                {{ t("app.theme.pink") }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <!-- 语言切换 -->
        <el-button link @click="changeLanguage">
          <n-icon :name="`language-${locale === 'zh-CN' ? 'zh' : 'es'}`" size="20" />
        </el-button>
        <!-- 设置按钮 -->
        <el-button link icon="Setting" @click="gotoGlobalSetting" />
        <!-- 版本信息 -->
        <el-tooltip v-if="needUpdate" effect="dark" :content="t('app.need-update')" placement="bottom">
          <el-button link :class="{ 'version-btn': needUpdate }" icon="Sell" @click="handlerVersionUpdate" />
        </el-tooltip>
        <el-tooltip v-else effect="dark" :content="`${t('app.current-version')} ${version}`">
          <el-button link icon="Warning" />
        </el-tooltip>
      </n-space>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.theme-btn {
  padding: 5px;
  border-color: var(--n-border-color);
  background-color: var(--n-bg-color-light);

  :deep(.el-dropdown-menu__item:not(.is-disabled)) {
    color: var(--n-text-color-base);
    border-radius: 4px;

    &:focus,
    &:not(.is-disabled):hover {
      background-color: var(--n-bg-color-base);
    }
  }

  .el-dropdown-menu__item {
    margin-bottom: 5px;
  }

  .is-disabled {
    border-radius: 4px;
    background-color: var(--n-bg-color-base);
  }

  :deep(.popper__arrow) {
    border-top-color: var(--n-bg-color-light) !important;

    &::after {
      border-top-color: var(--n-bg-color-light) !important;
    }
  }
}

.pt-shell-app-nav-bar {
  display: flex;
  flex-direction: column;
  align-content: center;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  height: 100vh;

  .pt-logo {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    height: 40px;

    .el-avatar {
      background: transparent;
    }
  }

  .icon-setting-container {
    padding-bottom: 10px;

    :deep(.el-button) {
      width: 40px;

      i {
        font-size: 20px;
      }

      &:hover {
        background-color: var(--n-hover-bg-color);
      }
    }

    .version-btn {
      color: #1de9b6 !important;
      text-shadow: 0 0 7px #1de9b6;
      animation: breathe 2.7s ease-in-out 0s infinite alternate;
      -webkit-animation: breathe 2.7s ease-in-out 0s infinite alternate;
    }
  }
}
</style>
