import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'
import PtComponents from '@/components'

import initI18n from '@/locals'
import PtSessionManger from '@/services'

import App from './App.vue'

import router from './router'
import pinia from './store'
import '@fontsource/dejavu-mono'
import '@/icons'
import './assets/scss/default.scss'

// Suppress benign ResizeObserver loop warning
window.addEventListener('error', (e) => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    e.stopImmediatePropagation()
  }
})

const app = createApp(App)
app.use(ElementPlus, { size: 'default', zIndex: 3000 })
app.use(PtComponents)
app.use(PtSessionManger)
app.use(pinia)
app.use(router)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

void (async function() {
  await PtSessionManger.initService()
  const i18n = await initI18n()
  app.use(i18n)
  app.mount('#app')
}())

window.addEventListener('keydown', (evt) => {
  if (evt.ctrlKey && evt.key === 'r') {
    evt.preventDefault()
  }
  if (evt.metaKey && evt.key === 'r') {
    evt.preventDefault()
  }
})
