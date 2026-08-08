<script setup>
import { computed, getCurrentInstance, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { closeAllMenu, popMenu, pushMenu } from './menuManager'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  translate: {
    type: Boolean,
    default: () => false
  }
})

defineOptions({ name: 'PtMenuItem' })

const { t } = useI18n()
const submenu = ref()
const showSubmenu = ref(false)

const label = computed(() => {
  if (props.item.label) {
    return props.item.label
  }
  return ''
})

const accelerator = computed(() => {
  if (!props.item.accelerator) {
    return ''
  }
  return props.item.accelerator
    .split('+')
    .map((key) => {
      key = key.trim().toLowerCase()
      return key[0].toUpperCase() + key.substr(1)
    })
    .join('+')
})
const instance = getCurrentInstance()
const parent = instance?.proxy.$parent
function handleMouseEnter() {
  popMenu(parent)
  if (props.item.submenu && props.item.submenu.length) {
    pushMenu(submenu.value)
    showSubmenu.value = true
  }
}
function handleClick() {
  if (typeof props.item.handler === 'function') {
    props.item.handler()
  }
  closeAllMenu()
}
</script>

<template>
  <div
    class="pt-menu-item"
    :class="{ 'pt-menu-separator': item.type === 'separator' }"
    @mouseenter="handleMouseEnter"
    @mousedown.left="handleClick"
  >
    <el-popover
      v-if="item.type === 'submenu'"
      placement="right"
      trigger="hover"
      :visible-arrow="true"
      popper-class="nx-content-submenu"
    >
      <pt-menu ref="submenu" :menu="item.submenu" :translate="true" @pop-stack="showSubmenu = false" />
      <template #reference>
        <div class="pt-menu-item-container">
          <span class="item-icon"><!-- 占位 --></span>
          <span class="item-label">{{ translate ? t(label) : label }}</span>
          <span class="item-accelerator">{{ accelerator }}</span>
          <n-icon name="arrow-right" size="18" class-name="item-submenu-arrow" />
        </div>
      </template>
    </el-popover>
    <div v-else-if="item.type === 'normal'" class="pt-menu-item-container">
      <span class="item-icon"><!-- 占位 --></span>
      <span class="item-label">{{ translate ? t(label) : label }}</span>
      <span class="item-accelerator">{{ accelerator }}</span>
      <span class="item-submenu-arrow"><!-- 占位 --></span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/scss/_const.scss' as *;

.nx-content-submenu {
  left: 100px;
  padding: 0 !important;
}

.pt-menu-item {
  position: relative;
  height: $menuItemHeight;
  line-height: $menuItemHeight;
  padding: 5px 5px 0 5px;

  &.pt-menu-separator {
    height: 1px !important;
    line-height: 1px !important;

    hr {
      border: none;
      height: 1px;
      background-color: var(--n-bg-color-base);
    }
  }

  .pt-menu-item-container {
    display: flex;
    align-items: center;

    &:hover {
      cursor: pointer;
      border-radius: 4px;
      background-color: var(--n-hover-bg-color);
    }

    .item-icon {
      display: inline-block;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .item-label {
      display: inline-block;
      flex-grow: 1;
      text-align: left;
      color: var(--n-text-color-base);
    }

    .item-accelerator {
      display: inline-block;
      flex-grow: 1;
      text-align: right;
      color: var(--n-text-color-base);
    }

    .item-submenu-arrow {
      display: inline-block;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      color: var(--n-text-color-base);
    }
  }
}
</style>
