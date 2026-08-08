<script>
export default {
  name: 'PtToolbar',
  props: {
    /**
         * 工具栏上的iconSize
         */
    leftWidth: {
      type: Number,
      default: 0
    },
    rightWidth: {
      type: Number,
      default: 0
    },
    centerStyle: {
      type: Object,
      default() {
        return {}
      }
    },
    height: {
      type: Number,
      default: 40
    }
  },

  computed: {
    style() {
      return {
        height: `${this.height}px`
      }
    }
  }
}
</script>

<template>
  <div class="pt-toolbar" :style="style">
    <div class="left">
      <slot name="left" />
    </div>
    <div class="center" :style="centerStyle">
      <slot name="center" />
    </div>
    <div class="right">
      <slot name="right" />
    </div>
  </div>
</template>

<style lang="scss">
.pt-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: {
    left: 10px;
    right: 10px;
  }

  background-color: var(--n-bg-color-base);

  .left {
    flex-shrink: 0;
  }

  .center {
    flex-grow: 1;
  }

  .right {
    flex-shrink: 0;
  }
}
</style>
