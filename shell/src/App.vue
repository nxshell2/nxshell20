<script setup>
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NxLayout from '@/layout/NxLayout.vue'
import { useSettingStore } from '@/store'

const settingStore = useSettingStore()
const { theme } = storeToRefs(settingStore)
const router = useRouter()
onMounted(() => {
  settingStore.changeTheme(theme.value)
  if (process.env.NODE_ENV !== 'development') {
    router.push({ name: 'Home' })
  }
})
</script>

<template>
  <NxLayout>
    <template #main-panel>
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </template>
  </NxLayout>
</template>

<style lang="scss">
#app {
  width: 100%;
  height: 100%;
  background-color: var(--n-bg-color-light);

  .control-panel {
    width: 100%;
    height: 100%;
  }

  .main-window {
    .control-panel {
      background-color: var(--n-bg-color-light);
    }
  }
}
</style>
