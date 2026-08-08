<script>
export default {
  name: 'PtFolder',
  props: {
    value: {
      type: String,
      default: ''
    },
    modelValue: {
      type: String,
      default: ''
    }
  },

  data() {
    return {
      fileNames: this.modelValue || this.value
    }
  },

  watch: {
    value(newVal) {
      if (newVal === this.fileNames) {
        return
      }
      this.fileNames = newVal
    },
    modelValue(newVal) {
      if (newVal === this.fileNames) {
        return
      }
      this.fileNames = newVal
    },
    fileNames(newVal) {
      this.$emit('update:modelValue', newVal)
    }
  },

  methods: {
    async openFolder() {
      const coreService = powertools.getService('powertools-core')
      const selectedFiles = await coreService.showOpenDialog({
        title: this.$t('home.fileview.file-dialog.save-folder'),
        properties: ['openDirectory']
      })
      if (selectedFiles.canceled) {
        return
      }
      this.fileNames = selectedFiles.filePaths[0]
      this.$emit('update:modelValue', this.fileNames)
      this.$emit('change')
    }
  }
}
</script>

<template>
  <div class="pt-file">
    <input type="text" style="display: none">
    <slot>
      <el-input v-model="fileNames" v-bind="$attrs" readonly class="n-input-file">
        <template #suffix>
          <el-button type="primary" icon="FolderOpened" class="n-file-button" @click="openFolder" />
        </template>
      </el-input>
    </slot>
  </div>
</template>

<style lang="scss" scoped>
.pt-file {
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: center;

  .n-input-file {
    width: auto !important;

    :deep(.el-input__suffix) {
      right: 0 !important;
    }
  }
}
</style>
