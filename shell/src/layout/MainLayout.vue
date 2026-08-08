<script setup>
import { storeToRefs } from 'pinia'
import { computed, useTemplateRef } from 'vue'
import * as EventBus from '@/services/eventbus'
import { useNxTabsStore } from '@/store'
import Welcome from '@/views/Welcome.vue'
import { NxMenus, NxTabMenu } from './components'

const nxTabsStore = useNxTabsStore()
const { configPanel, tabData } = storeToRefs(nxTabsStore)
const meunRef = useTemplateRef('menuRef')
// 是否有真实标签页（排除 Welcome，Welcome 不再是会话实例）
const hasRealTabs = computed(() => tabData.value.length > 0)

function handlerCollapsed() {
  const action = configPanel.value ? 'close' : 'open'
  configPanel.value = !configPanel.value
  EventBus.publish('session-config-panel', action)
}
</script>

<template>
  <div class="nx-layout-wrapper">
    <div v-show="configPanel" class="nx-layout-left">
      <NxMenus ref="menuRef" />
    </div>
    <div class="nx-layout-right" :style="{ width: `calc(100% - ${configPanel ? 295 : 0}px)` }">
      <div
        class="nx-layout-toggle-bar"
        :class="{ 'nx-layout-toggle-bar--collapsed': configPanel }"
        @click="handlerCollapsed"
      >
        <div class="nx-layout-toggle-bar__top" />
        <div class="nx-layout-toggle-bar__bottom" />
      </div>
      <!-- Default welcome slot: shown when no real tabs exist -->
      <Welcome v-if="!hasRealTabs" />

      <!-- Normal tab layout: shown when real tabs exist -->
      <template v-else>
        <NxTabMenu style="flex-shrink: 0" />
        <div class="nx-content">
          <router-view v-slot="{ Component }">
            <keep-alive :exclude="['GlobalSetting', 'lock']">
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss">
// 左侧工具栏宽度
$tool-box-width: 295px;
// 顶部Tabs 高度
$nx-content-tabs: 40px;
.nx-layout-wrapper {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  box-sizing: border-box;
  width: 100%;
  height: 100%;

  .nx-layout-left {
    width: $tool-box-width;
    height: 100%;
    box-sizing: border-box;
    padding: 5px 5px 0;
  }

  .nx-layout-right {
    position: relative;
    width: calc(100% - #{$tool-box-width});
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .nx-layout-toggle-bar {
      height: 72px;
      width: 32px;
      position: absolute;
      top: calc(50% - 36px);
      left: -5px;
      z-index: 100;

      &__top,
      &__bottom {
        position: absolute;
        width: 4px;

        border-radius: 2px;
        height: 38px;
        left: 14px;
        transition:
          background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
          transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background-color: rgba(191, 191, 191, 1);
      }

      &__bottom {
        position: absolute;
        top: 34px;
      }

      &:hover {
        cursor: pointer;

        .nx-layout-toggle-bar__top {
          transform: rotate(-12deg) scale(1.15) translateY(-2px);
        }

        .nx-layout-toggle-bar__bottom {
          transform: rotate(12deg) scale(1.15) translateY(2px);
        }
      }

      &--collapsed:hover {
        .nx-layout-toggle-bar__top {
          transform: rotate(12deg) scale(1.15) translateY(-2px);
        }

        .nx-layout-toggle-bar__bottom {
          transform: rotate(-12deg) scale(1.15) translateY(2px);
        }
      }
    }

    .nx-content {
      flex: 1;
      overflow: hidden;
      position: relative;
    }
  }
}
</style>
