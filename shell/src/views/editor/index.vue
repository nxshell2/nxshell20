<script>
import PtEditorView from './editorview'

export default {
  name: 'EditorWorkspace',
  components: {
    PtEditorView
  },
  beforeRouteUpdate(to, from, next) {
    if (to.path !== from.path) {
      const sessionId = parseInt(to.params.sessionId)
      this.currentSessionId = sessionId
      this.addSession(sessionId)
    }
    next()
  },
  data() {
    return {
      sessions: [],
      currentSessionId: -1
    }
  },

  activated() {
    this.currentSessionId = parseInt(this.$route.params.sessionId) || 0
    this.addSession(this.currentSessionId)
  },

  methods: {
    addSession(sessId) {
      if (this.sessions.findIndex(v => v == sessId) > -1) {
        return
      }
      this.sessions.push(sessId)
    },
    removeSession(idx) {
      this.sessions.splice(idx, 1)
    }
  }
}
</script>

<template>
  <div class="vnc-workspace">
    <PtEditorView
      v-for="(sessId, idx) in sessions"
      v-show="currentSessionId === sessId"
      :key="sessId"
      :session-id="sessId"
      @remove-session="removeSession(idx)"
    />
  </div>
</template>

<style lang="scss">
.vnc-workspace {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
