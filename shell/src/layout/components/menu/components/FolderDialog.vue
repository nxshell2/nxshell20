<script setup>
import { getCurrentInstance, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SESSION_CONFIG_TYPE, SessionConfig } from '@/services/sessionMgr'
import { useSessionStore } from '@/store'

const emits = defineEmits(['ok'])
const visible = ref(false)
const createFolderRef = ref()
const { t } = useI18n()
const title = ref('')
const folderForm = reactive({
  name: ''
})
const sessionStore = useSessionStore()
const sessionId = ref()
const proxy = getCurrentInstance()?.proxy
const sessionManager = proxy.$sessionManager

function validateFolderName(rule, value, callback) {
  if (!value) {
    callback(new Error(t('home.fileview.createdir-dialog.placeholder')))
  } else if (/[/:*?."？《》、，。'<>|]/.test(value)) {
    callback(new Error(t('home.fileview.createdir-dialog.invalid-dir-name', ['\\ / : * ? " < > | '])))
  } else {
    callback()
  }
}

function show($sessionId) {
  title.value = t('home.host-manager.dialog-edit-folder.add-title')
  if ($sessionId) {
    sessionId.value = $sessionId
    const sessionConfig = sessionManager.getSessionConfigById($sessionId)
    folderForm.name = sessionConfig.name
    title.value = t('home.host-manager.dialog-edit-folder.edit-title')
  }
  visible.value = true
}

function handlerBeforeClose() {
  sessionId.value = undefined
  createFolderRef.value?.resetFields()
}

function handlerClick() {
  createFolderRef.value?.validate((valid) => {
    if (valid) {
      if (!sessionId.value) {
        const sessionConfig = new SessionConfig(folderForm.name, SESSION_CONFIG_TYPE.FOLDER)
        sessionStore.appendSessionConfig(sessionConfig)
      } else {
        sessionManager.getSessionConfigById(sessionId.value).update(folderForm.name)
      }
      sessionStore.updateProcess()
      emits('ok')
      visible.value = false
    } else {
      return false
    }
  })
}

defineExpose({ show })
</script>

<template>
  <!-- 新建/编辑文件夹弹窗 -->
  <el-dialog
    v-model="visible"
    :title="title"
    :label-width="80"
    :close-on-click-modal="false"
    :append-to-body="true"
    width="400px"
    @before-close="handlerBeforeClose"
  >
    <el-form ref="createFolderRef" :model="folderForm" @submit.prevent>
      <el-form-item :label="$t('home.host-manager.dialog-edit-folder.folder-name')" prop="name" :rules="[{ validator: validateFolderName, trigger: 'change' }]">
        <el-input v-model="folderForm.name" @keyup.enter="handlerClick" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">{{ $t('components.Cancel') }}</el-button>
        <el-button type="primary" @click="handlerClick">{{ $t('components.OK') }}</el-button>
      </span>
    </template>
  </el-dialog>
</template>
