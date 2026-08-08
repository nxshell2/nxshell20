import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'
import XtermSession from '../views/xterm/xtermSession.vue'

const routes = [
  {
  path: '/',
  name: 'Home',
  component: MainLayout,
  children: [
    {
    path: 'welcome/:id',
    name: 'Welcome',
    component: () => import('../views/Welcome.vue')
    },
    {
    path: 'shell/:sessionId',
    name: 'XTermSession',
    component: XtermSession
    },
    {
    path: 'telnet/:sessionId',
    name: 'TelnetSession',
    component: () => import('../views/xterm/xtermSession.vue')
    },
    {
    path: 'localshell/:sessionId',
    name: 'LocalShellSession',
    component: () => import('../views/xterm/xtermSession.vue')
    },
    {
    path: 'serialport/:sessionId',
    name: 'SerialPortSession',
    component: () => import('../views/xterm/xtermSession.vue')
    },
    {
    path: 'login/:id',
    name: 'Login',
    component: () => import('../views/Login.vue')
    },
    {
    path: 'sftp/:sessionId',
    name: 'SFTP',
    component: () => import('../views/sftp/index.vue')
    },
    {
    path: 'editor/:sessionId',
    name: 'EDITOR',
    component: () => import('../views/editor/index.vue')
    },
    {
    path: 'vnc/:sessionId',
    name: 'VNC',
    component: () => import('../views/vnc/index.vue')
    },
    {
    path: 'ftp/:sessionId',
    name: 'FTP',
    component: () => import('../views/sftp/index.vue')
    },
    {
    path: 'webdav/:sessionId',
    name: 'WEBDAV',
    component: () => import('../views/sftp/index.vue')
    },
    {
    path: 'globalsetting/:sessionId',
    name: 'GlobalSetting',
    component: () => import('@/views/settings/index.vue')
    }
  ]
  },
  {
  path: '/lock',
  name: 'Lock',
  component: () => import(/* webpackChunkName: "lock" */ '../views/Lock.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes
})

const originalPush = router.push.bind(router)
const originalReplace = router.replace.bind(router)

router.push = to => originalPush(to).catch((err) => {
  console.error('Router push error:', err, 'to:', JSON.stringify(to)); return err
})
router.replace = to => originalReplace(to).catch((err) => {
  console.error('Router replace error:', err, 'to:', JSON.stringify(to)); return err
})

export default router
