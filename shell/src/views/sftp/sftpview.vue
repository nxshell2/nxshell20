<script>
import PtAuthDialog from '../components/auth/auth'
import FileView from '../components/fileview/fileview'

export default {
  name: 'PtSftpView',
  components: {
    FileView,
    PtAuthDialog
  },
  props: {
    mode: {
      type: String,
      default: 'full'
    },
    sessionId: {
      type: Number
    }
  },

  data() {
    return {
      currentDir: '/',
      getFs: null,
      dir: '/',

      hostInfo: {}
    }
  },

  created() {
    this.getFs = async() => {
      const sessionInstance = this.$sessionManager.getSessionInstanceById(this.sessionId)
      if (!sessionInstance) {
        throw new Error(`Session not found: ${this.sessionId}`)
      }
      return await sessionInstance.getFs()
    }

    const sessionInstance = this.$sessionManager.getSessionInstanceById(this.sessionId)
    if (!sessionInstance) {
      console.error('SFTP session not found:', this.sessionId)
      return
    }
    this.sessionInstance = sessionInstance

    this.sessionInstance.on('control', (data) => {
      this.$refs.dialog?.show(data)
    })

    this.sessionInstance.on('close', () => {
      // Let Vue handle DOM removal
    })

    const config = this.sessionInstance.cfg
    if (!config) {
      console.error('SFTP session config missing:', this.sessionId)
      return
    }

    this.dir = config.sftpDirt || '/'
    this.hostInfo = {
      username: config.username,
      host: config.hostAddress,
      uuid: config.uuid
    }
  },

  async beforeUnmount() {
    if (typeof this.getFs !== 'function') {
      return
    }
    try {
      const fs = await this.getFs()
      if (fs && typeof fs.dispose === 'function') {
        fs.dispose()
      }
    } catch(e) {
      // session may already be closed
    }
  },

  methods: {
    handleOpenDir(_dir) {},
    handleAuthOk(data) {
      this.sessionInstance?.sendControlData(data)
    }
  }
}
</script>

<template>
  <div class="pt-sftp-view">
    <FileView :get-fs="getFs" :cwd="dir" :host-info="hostInfo" />
    <PtAuthDialog ref="dialog" @auth-ok="handleAuthOk" />
  </div>
</template>

<style lang="scss">
.pt-sftp-view {
  position: relative;
  height: 100%;
  background-color: var(--n-bg-color-base);
}
</style>
