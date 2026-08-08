<script>
export default {
  name: 'PtFile',
  props: [
    'value',
    'modelValue',
    'type', // bytes(ArrayBuffer), text(String), file
    'multi',
    'accept'
  ],

  data() {
    return {
      fileNames: ''
    }
  },

  watch: {
    modelValue(newVal) {
      if (!newVal || (Array.isArray(newVal) && newVal.length === 0)) {
        this.fileNames = ''
      }
    }
  },

  methods: {
    openFile() {
      this.$refs.file.click()
    },

    async toFile(fileList) {
      return await this.transform(fileList, async(file) => {
        return await Promise.resolve(file)
      })
    },

    async transform(files, transFunc) {
      const count = this.multi ? files.length : 1
      const ret = []
      const fileNames = []
      for (let i = 0; i < count; i++) {
        const rawFile = files[i]
        const destFile = {
          name: rawFile.name,
          size: rawFile.size,
          data: await transFunc(rawFile)
        }
        ret.push(destFile)
        fileNames.push(rawFile.name)
      }
      this.fileNames = fileNames.join(';')
      return ret
    },

    async toBytes(fileList) {
      return await this.transform(fileList, async(file) => {
        return await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            resolve(e.target.result)
          }
          reader.readAsArrayBuffer(file)
        })
      })
    },

    async toString(fileList) {
      return await this.transform(fileList, async(file) => {
        return await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            resolve(e.target.result)
          }
          reader.readAsText(file)
        })
      })
    },

    handleFileDrop(e) {
      this.fileSelcted(e.dataTransfer.files)
    },

    handleFileOpen() {
      if (this.$refs.file.files.length === 0) {
        return
      }
      this.fileSelcted(this.$refs.file.files)
    },

    async fileSelcted(files) {
      let ret
      switch (this.type) {
        case 'bytes':
          ret = await this.toBytes(files)
          break
        case 'text':
          ret = await this.toString(files)
          break
        case 'file':
        default:
          ret = await this.toFile(files)
      }

      this.$emit('update:modelValue', ret)
    }
  }
}
</script>

<template>
  <div class="pt-file" @dragenter.stop.prevent @dragover.stop.prevent @drop.stop.prevent="handleFileDrop">
    <input
      ref="file"
      type="file"
      :accept="accept ? accept : '*'"
      :multiple="!!multi"
      style="display: none"
      @change="handleFileOpen"
    >
    <slot>
      <el-input v-model="fileNames" readonly>
        <template #append>
          <el-button link size="small" plain @click="openFile">
            {{ $t('Select') }}
          </el-button>
        </template>
      </el-input>
    </slot>
  </div>
</template>

<style lang="scss" scoped>
.pt-file {
  position: relative;
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 100%;

  :deep(.el-input-group__append) {
    .el-button {
      span {
        padding-right: 10px;
      }
    }
  }
}
</style>
