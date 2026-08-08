<script>
export default {
  name: 'NIcon',
  props: {
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: () => 'svg'
    },
    className: {
      type: String,
      default: ''
    },
    size: {
      type: [Number, String],
      default: 18
    }
  },
  computed: {
    isExternal() {
      // return isExternal(this.name)
      return false
    },
    iconName() {
      return `#icon-${this.name}`
    },
    iconSize() {
      switch (this.size) {
        case 'mini':
          return 12
        case 'small':
          return 18
        case 'medium':
          return 24
        case 'large':
          return 32
        case 'huge':
          return 64
        default:
          try {
            return parseInt(this.size)
          } catch(error) {
            return 18
          }
      }
    },
    styleExternalIcon() {
      return {
        'mask': `url(${this.name}) no-repeat 50% 50%`,
        '-webkit-mask': `url(${this.name}) no-repeat 50% 50%`,
        'width': `${this.size}px`,
        'height': `${this.size}px`
      }
    }
  }
}
</script>

<template>
  <span class="n-icon">
    <div v-if="isExternal" :style="styleExternalIcon" class="svg-external-icon svg-icon" />
    <svg
      v-else-if="type === 'svg'"
      class="svg-icon"
      :class="className"
      :width="iconSize"
      :height="iconSize"
      :style="{ 'min-width': `${iconSize}px`, 'min-height': `${iconSize}px` }"
      aria-hidden="true"
    >
      <use :xlink:href="iconName" />
    </svg>
    <img
      v-else
      class="n-icon-img"
      :src="name"
      :class="className"
      :width="iconSize"
      :height="iconSize"
      :style="{ 'min-width': `${iconSize}px`, 'min-height': `${iconSize}px` }"
      aria-hidden="true"
      alt="img"
    >
  </span>
</template>

<style lang="scss" scoped>
.n-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  vertical-align: middle;
}

.svg-icon {
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}

.svg-external-icon {
  background-color: currentColor;
  mask-size: cover !important;
  display: inline-block;
}

.n-icon-img {
  vertical-align: middle;
}
</style>
