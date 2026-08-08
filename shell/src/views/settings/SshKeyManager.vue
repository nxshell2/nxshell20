<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['refresh'])
const { t } = useI18n()
const powertools = window.powertools

const visible = ref(false)
const keys = ref([])
const loading = ref(false)
const showGenerateDialog = ref(false)
const generating = ref(false)
const genForm = ref({
  type: 'ed25519',
  name: '',
  passphrase: ''
})

function show() {
  visible.value = true
  loadKeys()
}

defineExpose({ show })

async function loadKeys() {
  loading.value = true
  try {
    keys.value = await powertools.listSshKeys()
  } catch(err) {
    ElMessage.error(err.message || String(err))
  } finally {
    loading.value = false
  }
}

async function handleGenerate() {
  if (!genForm.value.name) {
    genForm.value.name = genForm.value.type === 'ed25519' ? 'id_ed25519' : 'id_rsa'
  }
  generating.value = true
  try {
    await powertools.generateSshKey({
      type: genForm.value.type,
      name: genForm.value.name,
      passphrase: genForm.value.passphrase || undefined
    })
    ElMessage.success(t('home.settings.ssh-keys.generate-success'))
    showGenerateDialog.value = false
    genForm.value = { type: 'ed25519', name: '', passphrase: '' }
    await loadKeys()
  } catch(err) {
    ElMessage.error(err.message || String(err))
  } finally {
    generating.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      t('home.settings.ssh-keys.delete-confirm', [row.name]),
      t('home.settings.ssh-keys.delete'),
      { type: 'warning' }
    )
    await powertools.deleteSshKey(row.name)
    ElMessage.success(t('home.settings.ssh-keys.delete-success'))
    await loadKeys()
  } catch(err) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || String(err))
    }
  }
}

async function copyPublicKey(row) {
  try {
    const pubKey = await powertools.readSshPublicKey(row.name)
    await navigator.clipboard.writeText(pubKey)
    ElMessage.success(t('home.settings.ssh-keys.copy-success'))
  } catch(err) {
    ElMessage.error(err.message || String(err))
  }
}

watch(visible, (val) => {
  if (!val) {
    emit('refresh')
  }
})
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="t('home.settings.ssh-keys.title')"
    width="680px"
    :close-on-click-modal="false"
    append-to-body
  >
    <div style="margin-bottom: 12px; display: flex; justify-content: flex-end;">
      <el-button type="primary" size="small" @click="showGenerateDialog = true">
        {{ t('home.settings.ssh-keys.generate') }}
      </el-button>
    </div>

    <el-table v-loading="loading" :data="keys" style="width: 100%" empty-text="" max-height="360">
      <el-table-column prop="name" :label="t('home.settings.ssh-keys.col-name')" width="180" />
      <el-table-column prop="type" :label="t('home.settings.ssh-keys.col-type')" width="140" />
      <el-table-column prop="comment" :label="t('home.settings.ssh-keys.col-comment')" />
      <el-table-column prop="createdAt" :label="t('home.settings.ssh-keys.col-created')" width="180">
        <template #default="{ row }">
          {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '' }}
        </template>
      </el-table-column>
      <el-table-column :label="t('home.settings.ssh-keys.col-actions')" width="200" fixed="right">
        <template #default="{ row }">
          <span class="key-action-link key-action-primary" @click="copyPublicKey(row)">{{ t('home.settings.ssh-keys.copy-public') }}</span>
          <span class="key-action-link key-action-danger" @click="handleDelete(row)">{{ t('home.settings.ssh-keys.delete') }}</span>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="showGenerateDialog"
      :title="t('home.settings.ssh-keys.generate-title')"
      width="480px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form label-position="top" @submit.prevent>
        <el-form-item :label="t('home.settings.ssh-keys.key-type')">
          <el-select v-model="genForm.type" style="width: 100%">
            <el-option label="ED25519" value="ed25519" />
            <el-option label="RSA 4096" value="rsa" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('home.settings.ssh-keys.key-name')">
          <el-input v-model="genForm.name" :placeholder="genForm.type === 'ed25519' ? 'id_ed25519' : 'id_rsa'" />
        </el-form-item>
        <el-form-item :label="t('home.settings.ssh-keys.passphrase')">
          <el-input
            v-model="genForm.passphrase"
            type="password"
            show-password
            :placeholder="t('home.settings.ssh-keys.passphrase-placeholder')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGenerateDialog = false">
          {{ t('components.Cancel') }}
        </el-button>
        <el-button type="primary" :loading="generating" @click="handleGenerate">
          {{ t('home.settings.ssh-keys.generate') }}
        </el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<style lang="scss" scoped>
.key-action-link {
  cursor: pointer;
  font-size: 13px;
  margin-right: 12px;

  &:hover {
    text-decoration: underline;
  }
}

.key-action-primary {
  color: var(--el-color-primary, #409eff);
}

.key-action-danger {
  color: var(--el-color-danger, #f56c6c);
}
</style>
