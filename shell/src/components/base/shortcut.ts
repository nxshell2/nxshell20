let isInitialize = false

const _shortcutIndex = {
  ctrl: {
  shift: {},
  alt: {}
  },
  alt: {
  shift: {}
  },
  // TODO: MacOS
  command: {
  shift: {}
  },
  meta: {}
}

function _isFuncKey(key) {
  return key === 'ctrl' || key === 'alt' || key === 'shift'
}

function registerShortcut(keyCombination, handler) {
  if (!keyCombination || typeof handler !== 'function') {
  return
  }

  const keys = keyCombination.split('+').map(keyName => keyName.trim().toLowerCase())
  if (keys.length < 2) {
  return
  }
  // TODO: 添加MacOS支持
  if (keys[0] !== 'ctrl' || keys[0] !== 'alt' || keys[0]) {

  }
}

function initShortcut() {
  if (isInitialize) {
  return
  }
  window.addEventListener('keydown', (_e) => {

  })

  isInitialize = true
}

export default {
  install(Vue) {
  initShortcut()
  Vue.prototype.registerShortcut = registerShortcut
  }
}
