<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { publish } from '@/services/eventbus'
import sessionManager, { SESSION_CONFIG_TYPE, SessionConfig } from '@/services/sessionMgr'
import { useSessionStore } from '@/store'
import SessionFormLayout from '../SessionFormLayout.vue'
import { defaultForm } from './constants'

const emits = defineEmits(['ok', 'cancel'])
const { t } = useI18n()
const sessionStore = useSessionStore()
const formLayoutRef = ref()
const deepClone = obj => JSON.parse(JSON.stringify(obj || {}))
const formData = ref(deepClone(defaultForm))

const vncFormRules = {
  hostName: [{ required: true, message: t('home.profile.base.host-name.required'), trigger: 'blur' }],
  hostAddress: [{ required: true, message: t('home.profile.base.host.placeholder'), trigger: 'blur' }],
  hostVncPort: [{ required: true, message: t('home.profile.base.port.placeholder'), trigger: 'blur' }]
}

async function saveOrUpdateSession() {
  const layout = formLayoutRef.value
  const formVal = layout.getFormData()
  const isEdit = layout.getIsEdit()
  const sessionConfig = layout.getSessionConfig()
  const sessionName = formVal.hostName

  if (isEdit) {
    sessionConfig.update(sessionName, Object.assign(sessionConfig.config, formVal), '')
  } else {
    const newConfig = new SessionConfig(
      sessionName,
      SESSION_CONFIG_TYPE.NODE,
      formVal,
      'vnc session'
    )
    await sessionStore.appendSessionConfig(newConfig)
  }
  publish('refresh-session-tree')
  return { formVal, sessionConfig, isEdit }
}

async function handleSave() {
  const { formVal } = await saveOrUpdateSession()
  formLayoutRef.value?.close()
  emits('ok', formVal)
}

async function handleSaveAndConnect() {
  const { formVal, sessionConfig } = await saveOrUpdateSession()
  await sessionManager.createSessionInstance(sessionConfig)
  formLayoutRef.value?.close()
  emits('ok', formVal)
}

function handleCancel() {
  emits('cancel')
}

function showModal(sessionId) {
  for (const key of Object.keys(formData.value)) {
    delete formData.value[key]
  }
  Object.assign(formData.value, deepClone(defaultForm))
  formLayoutRef.value?.showModal(sessionId)
}

defineExpose({ showModal })
</script>

<template>
  <SessionFormLayout
    ref="formLayoutRef"
    protocol="VNC"
    :rules="vncFormRules"
    :default-form="defaultForm"
    description="vnc session"
    :form-data="formData"
    @save="handleSave"
    @save-and-connect="handleSaveAndConnect"
    @cancel="handleCancel"
  >
    <template #base>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-form-item :label="$t('home.profile.base.host.title')" prop="hostAddress">
            <el-input v-model="formData.hostAddress" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="$t('home.profile.base.port.title')" prop="hostVncPort">
            <el-input-number v-model="formData.hostVncPort" :min="1" :max="65535" controls-position="right" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-form-item :label="$t('home.profile.auth.username.title')" prop="username">
            <el-input v-model="formData.username" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="$t('home.profile.auth.password.title')" prop="password">
            <el-input v-model="formData.password" />
          </el-form-item>
        </el-col>
      </el-row>
    </template>
  </SessionFormLayout>
</template>
