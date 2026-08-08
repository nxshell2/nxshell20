<script lang="ts" setup>
import { Terminal } from '@xterm/xterm'
import { onMounted, ref } from 'vue'

const props = defineProps({})
const xtermRef = ref()
const xtermInstance = ref()

onMounted(() => {
  const options = { wordSeparator: ' /\\()"\'-.,:;<>~!@#$%^&*|+=[]{}~?│', ...props }
  // 优化xterm终端边距
  if (Object.hasOwn(options, 'theme') && options.theme) {
    const { background = '#000' } = options.theme
    this.backgroundColor = background
  }
  xtermInstance.value = new Terminal(options)
})
</script>

<template>
  <div class="n-terminal-container">
    <!-- xterm 终端实例盒子 -->
    <div ref="xtermRef" class="xterm-instance" />
  </div>
</template>
