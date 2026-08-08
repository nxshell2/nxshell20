<script setup>
import { computed, getCurrentInstance, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { querySearch } from '@/icons/system-icon'
import xtermThemeList from '@/views/session/components/xtermTheme/index.vue'
import { initDefaultThemeOptions } from './constants'

const props = defineProps({
  protocol: { type: String, default: '' },
  showPortForward: { type: Boolean, default: false },
  showAdvanced: { type: Boolean, default: false },
  rules: { type: Object, default: () => ({}) },
  defaultForm: { type: Object, default: () => ({}) },
  description: { type: String, default: '' },
  formData: { type: Object, required: true }
})
const emits = defineEmits(['save', 'save-and-connect', 'cancel'])
const { configItems, formItem } = initDefaultThemeOptions()
const { t } = useI18n()

const visible = ref(false)
const formRef = ref()
const activeTab = ref('base')
const isEdit = ref(false)
const sessionConfig = ref()

// Use parent's formData directly (single source of truth)
const formData = props.formData || {}

const deepClone = obj => JSON.parse(JSON.stringify(obj || {}))

// Merge theme/formItem fields into the parent's formData (shared reactive object)
for (const key of Object.keys(formItem)) {
  if (!(key in formData)) {
    formData[key] = formItem[key]
  }
}
const proxy = getCurrentInstance()?.proxy
const sessionManager = proxy.$sessionManager

const dialogTitle = computed(() => {
  const protocolLabel = t(`components.session.protocol-names.${props.protocol}`, props.protocol || 'Session')
  return isEdit.value
    ? t('components.session.modal-title-edit', { protocol: protocolLabel })
    : t('components.session.modal-title-add', { protocol: protocolLabel })
})

function showModal(sessionId) {
  // Re-merge theme defaults — parent may have reset formData to just defaultForm
  for (const key of Object.keys(formItem)) {
    if (!(key in formData)) {
      formData[key] = formItem[key]
    }
  }
  if (sessionId) {
    isEdit.value = true
    sessionConfig.value = sessionManager.getSessionConfigById(sessionId)
    const sessionData = deepClone(sessionConfig.value.config)
    for (const key of Object.keys(sessionData)) {
      const value = sessionData[key]
      if (value !== undefined && value !== null) {
        formData[key] = value
      }
    }
  }
  visible.value = true
}

const getFormData = () => formData
const getSessionConfig = () => sessionConfig.value
const getIsEdit = () => isEdit.value
function resetForm() {
  isEdit.value = false
  sessionConfig.value = undefined
  for (const key of Object.keys(formData)) {
    delete formData[key]
  }
  Object.assign(formData, deepClone(props.defaultForm), deepClone(formItem))
  formRef.value?.clearValidate()
  activeTab.value = 'base'
}

function handleOk() {
  formRef.value.validate((valid) => {
    if (!valid) {
      return false
    }
    emits('save', { formData, sessionConfig: sessionConfig.value, isEdit: isEdit.value })
  })
}

function handleSaveAndConnect() {
  formRef.value.validate((valid) => {
    if (!valid) {
      return false
    }
    emits('save-and-connect', { formData, sessionConfig: sessionConfig.value, isEdit: isEdit.value })
  })
}

function handleCancel() {
  close()
  emits('cancel')
}

function close() {
  resetForm()
  visible.value = false
}

defineExpose({ showModal, close, getFormData, getSessionConfig, getIsEdit, resetForm })
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    append-to-body
    width="85%"
    :style="{ 'min-width': '900px', 'max-width': '1200px' }"
    :show-close="false"
    :destroy-on-close="false"
    :close-on-click-modal="false"
    class="n-session-form-layout"
    @close="handleCancel"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      class="n-session-ssh-container"
      label-position="top"
      label-width="80px"
    >
      <div class="n-session-ssh-container__left">
        <el-form-item :label="t('home.profile.base.host-name.title')" prop="hostName">
          <el-input
            v-model="formData.hostName"
            :placeholder="t('home.profile.base.host-name.placeholder')"
          />
        </el-form-item>
        <el-form-item :label="t('components.session.base.system-icon')" prop="system">
          <n-space>
            <el-autocomplete
              v-model="formData.system"
              value-key="icon"
              :fetch-suggestions="querySearch"
              clearable
              :placeholder="t('components.session.base.system-icon-placeholder')"
            />
            <n-icon :name="formData.system" size="24" />
          </n-space>
        </el-form-item>
      </div>
      <div class="n-session-ssh-container__right">
        <el-tabs v-model="activeTab" type="border-card">
          <el-tab-pane :label="t('components.session.base.label')" name="base">
            <slot name="base" />
          </el-tab-pane>
          <el-tab-pane v-if="showPortForward" :label="t('components.session.port.label')" name="portForward">
            <slot name="portForward" />
          </el-tab-pane>
          <el-tab-pane v-if="showAdvanced" :label="t('components.session.advanced.label')" name="advanced">
            <slot name="advanced" />
          </el-tab-pane>
          <el-tab-pane :label="t('components.session.theme.label')" name="theme">
            <div class="n-theme-form">
              <div class="n-theme-form__left">
                <el-row v-for="item in configItems" :key="item.name" :title="t(item.description)" class="item">
                  <el-col :span="6">
                    <label>{{ t(item.title) }}</label>
                  </el-col>
                  <el-col :offset="3" :span="14">
                    <el-input
                      v-if="['text', 'password'].includes(item.type)"
                      v-model="formData[item.name]"
                      :type="item.type"
                    />
                    <el-input-number
                      v-if="item.type === 'number'"
                      v-model="formData[item.name]"
                      :step="item.step"
                      :min="1"
                      controls-position="right"
                      style="width: 100%"
                    />
                    <el-switch v-if="item.type === 'switch'" v-model="formData[item.name]" />
                    <el-radio-group
                      v-if="item.type === 'radio-group'"
                      v-model="formData[item.name]"
                    >
                      <el-radio-button
                        v-for="(r, index) in item.options"
                        :key="index"
                        :value="r.value"
                      >
                        {{ r.label }}
                      </el-radio-button>
                    </el-radio-group>
                    <el-select
                      v-if="item.type === 'select'"
                      v-model="formData[item.name]"
                      style="width: 100%"
                    >
                      <el-option
                        v-for="(opt, idx) in item.options"
                        :key="idx"
                        :label="t(opt.label)"
                        :value="opt.value"
                      />
                    </el-select>
                  </el-col>
                </el-row>
              </div>
              <div class="n-theme-form__right">
                <xtermThemeList v-model:value="formData.xtermTheme" :theme-options="formData" />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">
          {{ t('components.Cancel') }}
        </el-button>
        <el-button type="primary" @click="handleOk">
          {{ t('components.OK') }}
        </el-button>
        <el-button type="primary" @click="handleSaveAndConnect">
          {{ t('home.profile.operator.save-conn') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
:deep(.el-dialog__body) {
  max-height: 75vh;
  overflow-y: auto;
}

.n-session-ssh-container {
  display: flex;
  justify-content: space-between;
  column-gap: 10px;

  &__left {
    width: 180px;
    min-width: 180px;
    padding-top: 12px;
  }

  &__right {
    flex: 1;

    .n-port-forward {
      display: flex;
      column-gap: 5px;
      justify-content: space-between;
      width: 100%;

      &__source,
      &__target {
        flex: 1;
        display: inline-flex;
        column-gap: 5px;
      }
    }

    .n-theme-form {
      display: flex;
      gap: 10px;

      &__left {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      &__right {
        flex: 1;
        max-height: 400px;
        overflow: hidden;
      }

      .item {
        flex-shrink: 0;
      }

      :deep(.el-radio-button.is-active .el-radio-button__inner),
      :deep(.el-radio-button.is-checked .el-radio-button__inner),
      :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
        background-color: var(--el-color-primary) !important;
        border-color: var(--el-color-primary) !important;
        color: var(--el-color-white, #fff) !important;
        box-shadow: -1px 0 0 0 var(--el-color-primary) !important;
      }
    }
  }
}
</style>
