<script setup>
import { useI18n } from 'vue-i18n'

const props = defineProps({
  title: {
    type: String,
    default: () => ''
  }
})

const emits = defineEmits(['cancel', 'ok'])

defineOptions({ name: 'NxModal' })

const { t } = useI18n()

function cancel() {
  emits('cancel')
}

function ok() {
  emits('ok')
}
</script>

<template>
  <el-dialog
    :title="t(props.title)"
    :close-on-click-modal="false"
    :show-close="false"
    :append-to-body="true"
    width="400px"
    v-bind="$attrs"
  >
    <slot name="default" />
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="cancel">
          {{ t('components.Cancel') }}
        </el-button>
        <el-button type="primary" @click="ok">
          {{ t('components.OK') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
