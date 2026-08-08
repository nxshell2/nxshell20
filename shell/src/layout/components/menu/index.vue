<script setup>
import { storeToRefs } from 'pinia'
import { getCurrentInstance, markRaw, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { NxButton } from '@/components'
import { showContextMenu } from '@/components/menu/contextmenu'
import NSpace from '@/components/space'
import { subscript, unsubscript } from '@/services/eventbus'
import { SESSION_CONFIG_TYPE } from '@/services/sessionMgr'
import mountManager from '@/services/storage/mountManager'
import { useNxTabsStore, useSessionStore } from '@/store'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { shellModalInstance } from '@/views/components/session'
import MountManager from '@/views/components/mount/MountManager.vue'
import NxFolderDialog from './components/FolderDialog.vue'

const sessionTreeRef = ref()
const folderDialogRef = ref()
const sshModalRef = ref()
const { t } = useI18n()
const menuProps = reactive({
  highlightCurrent: false,
  expandedKeys: []
})
const nxTabStore = useNxTabsStore()
const sessionStore = useSessionStore()
const {} = storeToRefs(nxTabStore)
const { menuTree, currentNode } = storeToRefs(sessionStore)
const proxy = getCurrentInstance()?.proxy
const sessionManager = proxy.$sessionManager
const sessionModal = shallowRef()
const sessionModalRef = ref()
const showExtend = ref(false)
const mountManagerVisible = ref(false)

function createFolder(name) {
  folderDialogRef.value?.show(name)
}

function showMountManager() {
  mountManagerVisible.value = true
}

function handleMountChange() {
  // 挂载点变化后刷新会话树
  sessionStore.updateProcess()
}

async function refreshMount() {
  // 刷新当前挂载点的会话
  const mountId = currentNode.value.sessionData?.mountId
  if (mountId) {
    try {
      await sessionManager.loadMountSessions(mountId)
      // 加载成功，更新挂载点状态为在线
      const mount = sessionManager.getMountRoots().find(r => r.mountId === mountId)
      if (mount) {
        const mountInfo = mountManager.getMount(mountId)
        if (mountInfo) {
          mountInfo.status = 'online'
        }
      }
    } catch(e) {
      console.warn(`Refresh mount ${mountId} failed:`, e)
    } finally {
      sessionStore.updateProcess()
    }
  }
}

const clipboard = reactive({
  data: null,
  operate: ''
})

function handleOpenSFTP(data) {
  sessionManager.createSFTPSessionInstance(data)
}

// 复制/剪切会话
function menuClipboard(type) {
  clipboard.operate = type
  clipboard.data = currentNode.value.sessionData
}

// 粘贴会话
function handleSessionTreeContextMenu_Paste() {
  try {
    const { data, operate } = clipboard
    if (!data) {
      return
    }
    const sessionConfig = sessionManager.getSessionConfigById(data?.id)
    if (!sessionConfig) {
      console.warn('source session config is null')
      return
    }
    if (operate === 'cut') {
      sessionConfig._parent.removeSubSessionConfig(sessionConfig, true)
    }
    sessionStore.appendSessionConfig(operate === 'cut' ? sessionConfig : sessionConfig.duplicate())
  } catch(error) {
    console.error('剪切复制异常', error)
    return null
  } finally {
    // 当前只粘贴一次，避免不必要的麻烦
    clipboard.data = null
    clipboard.operate = ''
  }
}

/**
 * 删除会话或者会话目录
 */
function handleDelete(sessionId) {
  const sessionConfig = sessionManager.getSessionConfigById(sessionId)
  const message
    = sessionConfig.type === SESSION_CONFIG_TYPE.NODE
      ? t('home.host-manager.dialog-delete-confirm.delete-node', [sessionConfig.name])
      : t('home.host-manager.dialog-delete-confirm.delete-folder', [sessionConfig.name])
  proxy
    ?.$confirm(message, t('home.host-manager.dialog-delete-confirm.title'), {
      type: 'warning'
    })
    .then(() => {
      sessionManager.removeSessionConfig(sessionConfig)
      handleSessionTreeContainerClick()
      sessionStore.updateProcess()
    })
    .catch(() => {})
}
/**
 * 编辑文件夹
 */
const renameFolder = () => folderDialogRef.value?.show(currentNode.value.sessionId)
/**
 * 打开会话
 *
 * @param sessionData
 * @return {Promise<void>}
 */
async function handleHostOpen(sessionData) {
  if (sessionData.type === SESSION_CONFIG_TYPE.FOLDER) {
    // 目录节点不启动会话实例
    return
  }
  await sessionManager.createSessionInstance(sessionData)
}

/**
 * 导出配置文件
 *
 * @returns 导出的配置文件
 */
async function exportSessionConfig() {
  const coreService = powertools.getService('powertools-core')
  const selectedFiles = await coreService.showSaveDialog({
    properties: ['openFile']
  })

  if (selectedFiles.canceled) {
    return
  }

  const filePath = selectedFiles.filePath
  try {
    await sessionManager.exportConfig(filePath)
  } catch(e) {
    console.log('export config error ', e)
  }
}

/**
 * 导入配置文件
 *
 */
async function importSessionConfig() {
  const coreService = powertools.getService('powertools-core')
  const selectedFiles = await coreService.showOpenDialog({
    properties: ['openFile']
  })

  if (selectedFiles.canceled) {
    return
  }

  const filePath = selectedFiles.filePaths[0]

  try {
    await sessionManager.importConfig(filePath)
    sessionStore.updateProcess()
  } catch(e) {
    console.log('import config error ', e)
  }
}

function createShellModal(type) {
  sessionModal.value = markRaw(shellModalInstance(type))
  nextTick(() => sessionModalRef.value?.showModal())
}

const contextMenus = {
  folder: [
    {
      label: 'home.sessions-context-menu.create-folder',
      type: 'normal',
      handler: createFolder
    },
    {
      label: 'home.sessions-context-menu.create-session',
      type: 'submenu',
      submenu: [
        {
          label: 'SSH',
          type: 'normal',
          handler: () => createShellModal('ssh')
        },
        {
          label: 'SFTP',
          type: 'normal',
          handler: () => createShellModal('ftp')
        },
        {
          label: 'Serial',
          type: 'normal',
          handler: () => createShellModal('serial')
        },
        {
          label: 'Telnet',
          type: 'normal',
          handler: () => createShellModal('telnet')
        },
        {
          label: 'VNC',
          type: 'normal',
          handler: () => createShellModal('vnc')
        },
        {
          label: 'localShell',
          type: 'normal',
          handler: () => createShellModal('localShell')
        }
      ]
    },
    {
      label: 'home.sessions-context-menu.cut',
      type: 'normal',
      handler: () => menuClipboard('cut')
    },
    {
      label: 'home.sessions-context-menu.copy',
      type: 'normal',
      handler: () => menuClipboard('copy')
    },
    {
      label: 'home.sessions-context-menu.paste',
      type: 'normal',
      handler: handleSessionTreeContextMenu_Paste
    },
    {
      label: 'home.sessions-context-menu.delete',
      type: 'normal',
      handler: () => handleDelete(currentNode.value.sessionId)
    },
    {
      label: 'home.sessions-context-menu.rename',
      type: 'normal',
      handler: renameFolder
    }
  ],
  node: [
    {
      label: 'home.sessions-context-menu.connect',
      type: 'normal',
      handler: () => handleHostOpen(currentNode.value.sessionData.data)
    },
    {
      label: 'home.sessions-context-menu.cut',
      type: 'normal',
      handler: () => menuClipboard('cut')
    },
    {
      label: 'home.sessions-context-menu.copy',
      type: 'normal',
      handler: () => menuClipboard('copy')
    },
    {
      label: 'home.sessions-context-menu.delete',
      type: 'normal',
      handler: () => handleDelete(currentNode.value.sessionId)
    },
    {
      label: 'home.sessions-context-menu.prop',
      type: 'normal',
      handler: () => {
        const { sessionId, protocol } = currentNode.value
        sessionModal.value = markRaw(shellModalInstance(protocol))
        nextTick(() => sessionModalRef.value?.showModal(sessionId))
      }
    }
  ],
  empty: [
    {
      label: 'home.sessions-context-menu.create-folder',
      type: 'normal',
      handler: createFolder
    },
    {
      label: 'home.sessions-context-menu.create-session',
      type: 'submenu',
      submenu: [
        {
          label: 'SSH',
          type: 'normal',
          handler: () => {
            sessionModal.value = markRaw(shellModalInstance('ssh'))
            nextTick(() => sessionModalRef.value?.showModal())
          }
        },
        {
          label: 'SFTP',
          type: 'normal',
          handler: () => {
            sessionModal.value = markRaw(shellModalInstance('ftp'))
            nextTick(() => sessionModalRef.value?.showModal())
          }
        },
        {
          label: 'Serial',
          type: 'normal',
          handler: () => {
            sessionModal.value = markRaw(shellModalInstance('serial'))
            nextTick(() => sessionModalRef.value?.showModal())
          }
        },
        {
          label: 'Telnet',
          type: 'normal',
          handler: () => {
            sessionModal.value = markRaw(shellModalInstance('telnet'))
            nextTick(() => sessionModalRef.value?.showModal())
          }
        },
        {
          label: 'localShell',
          type: 'normal',
          handler: () => {
            sessionModal.value = markRaw(shellModalInstance('localShell'))
            nextTick(() => sessionModalRef.value?.showModal())
          }
        },
        {
          label: 'VNC',
          type: 'normal',
          handler: () => {
            sessionModal.value = markRaw(shellModalInstance('vnc'))
            nextTick(() => sessionModalRef.value?.showModal())
          }
        }
      ]
    },
    {
      label: 'home.sessions-context-menu.save-config',
      type: 'normal',
      handler: exportSessionConfig
    },
    {
      label: 'home.sessions-context-menu.import-config',
      type: 'normal',
      handler: importSessionConfig
    },
    {
      label: 'home.sessions-context-menu.mount-manager',
      type: 'normal',
      handler: () => showMountManager()
    }
  ],
  // 挂载点根节点的右键菜单
  mount: [
    {
      label: 'home.sessions-context-menu.create-folder',
      type: 'normal',
      handler: createFolder
    },
    {
      label: 'home.sessions-context-menu.create-session',
      type: 'submenu',
      submenu: [
        {
          label: 'SSH',
          type: 'normal',
          handler: () => createShellModal('ssh')
        },
        {
          label: 'SFTP',
          type: 'normal',
          handler: () => createShellModal('ftp')
        },
        {
          label: 'Serial',
          type: 'normal',
          handler: () => createShellModal('serial')
        },
        {
          label: 'Telnet',
          type: 'normal',
          handler: () => createShellModal('telnet')
        },
        {
          label: 'VNC',
          type: 'normal',
          handler: () => createShellModal('vnc')
        },
        {
          label: 'localShell',
          type: 'normal',
          handler: () => createShellModal('localShell')
        }
      ]
    },
    {
      label: 'home.sessions-context-menu.refresh',
      type: 'normal',
      handler: () => refreshMount()
    },
    {
      label: 'home.sessions-context-menu.mount-manager',
      type: 'normal',
      handler: () => showMountManager()
    }
  ]
}

async function handleNodeDrop(source, parentNode, position) {
  const targetSession = sessionManager.getSessionConfigById(parentNode.data.data._id)
  const sourceNode = sessionManager.getSessionConfigById(source.data.data._id)
  sourceNode._parent.removeSubSessionConfig(sourceNode, true)
  if (position === 'inner') {
    targetSession.addSessionConfig(sourceNode)
  } else {
    const { index } = targetSession._parent.findSubSessionConfig(parentNode.data.data._id)
    const destIndex = index + (position === 'before' ? 0 : 1)
    targetSession._parent.addSessionConfig(sourceNode, destIndex)
  }
  await sessionManager.saveSessionConfigs()
  sessionStore.updateProcess()
}

/**
 * 树容器操作
 */
function handleSessionTreeContainerClick() {
  sessionStore.updateCurrentNode(sessionTreeRef.value)
  menuProps.highlightCurrent = false
}

function handleNodeSelected(data, node, _vnode, _element) {
  // 修复由于当前文件夹下子元素为0 导致tree无法触发原有打开关闭事件
  if (data.isFolder && data.children.length === 0) {
    node.expanded = !node.expanded
  }
  const { data: sessionData } = data
  sessionStore.updateCurrentNode(sessionTreeRef.value, node, data)
  if (data.isFolder) {
    // 目录节点不启动会话实例
    return
  }
  // 尝试激活会话实例窗口
  const sessionInstance = sessionManager.matchSessionInstanceByConfig(sessionData)
  if (!sessionInstance) {
    // 没有匹配到则创建新的实例
    return
  }

  nextTick(() => {
    nxTabStore.activateSessionByInstance(sessionInstance[0])
  })
}

function nodeContextmenu(event, data, node, _vnode) {
  sessionStore.updateCurrentNode(sessionTreeRef.value, node, data)
  const { type: nodeType } = data.data
  let menuContent = []

  // 挂载点根节点的右键菜单
  if (data.isMount) {
    menuContent = contextMenus.mount
  } else if (data.isFolder) {
    menuContent = contextMenus.folder
  }

  if (nodeType === SESSION_CONFIG_TYPE.NODE) {
    // TODO: 获取SessionConfig的状态，过滤掉一些无用状态
    const contextMenu = [...contextMenus.node]
    const { data } = currentNode.value.sessionData
    if (data.config.protocal === 'ssh') {
      contextMenu.unshift({
        label: 'home.sessions-context-menu.sftp',
        type: 'normal',
        handler: () => handleOpenSFTP(data)
      })
    }
    menuContent = contextMenu
  }
  showContextMenu(menuContent, event)
}

function menuSearch(value, data) {
  if (!value) {
    return true
  }
  return data.text.includes(value)
}
// 监听远程挂载点加载完成
function onMountSessionsLoaded() {
  sessionStore.updateProcess()
}

onMounted(() => {
  // 订阅主机搜索事件
  subscript('nx-menu-search', (keywords) => {
    sessionTreeRef.value?.filter(keywords)
  })
  // 订阅新建文件夹事件
  subscript('create-session-folder', () => createFolder())
  // 订阅菜单刷新事件
  subscript('refresh-session-tree', () => sessionStore.updateProcess())
  // 订阅会话添加事件
  subscript('session-added', () => sessionStore.updateProcess())
  // 订阅会话创建事件
  // subscript('create-session-toolbar', () => telnetModalRef.value?.showModal())
  subscript('create-session-toolbar', type => createShellModal(type))
  // 监听远程挂载点会话加载完成
  sessionManager.on('mount-sessions-loaded', onMountSessionsLoaded)
  nextTick(() => sessionStore.updateCurrentNode(sessionTreeRef.value))
})
onBeforeUnmount(() => {
  // 订阅主机搜索事件
  unsubscript('nx-menu-search', keywords => sessionStore.updateProcess(keywords))
  // 订阅新建文件夹事件
  unsubscript('create-session-folder', () => createFolder())
  // 订阅菜单刷新事件
  unsubscript('refresh-session-tree', () => sessionStore.updateProcess())
  // 订阅会话添加事件
  unsubscript('session-added', () => sessionStore.updateProcess())
  // 订阅会话创建事件
  unsubscript('create-session-toolbar', () => sshModalRef.value?.showModal())
  // 移除远程挂载点监听
  sessionManager.off('mount-sessions-loaded', onMountSessionsLoaded)
})
</script>

<template>
  <div v-context-menu="contextMenus.empty" class="nx-menu-wrapper" @contextmenu.stop="handleSessionTreeContainerClick" @click="handleSessionTreeContainerClick">
    <!-- 提示创建会话配置 -->
    <el-scrollbar style="height: calc(100% - 32px)">
      <el-tree
        v-show="menuTree.length > 0"
        ref="sessionTreeRef"
        node-key="id"
        icon-class="empty"
        draggable
        :highlight-current="menuProps.highlightCurrent"
        :data="menuTree"
        :props="{ children: 'children', label: 'text' }"
        :filter-node-method="menuSearch"
        :empty-text="t('home.host-manager.session-tree.no-search-result')"
        @node-contextmenu="nodeContextmenu"
        @node-drop="handleNodeDrop"
        @node-click="handleNodeSelected"
      >
        <template #default="{ node, data: nodeData }">
          <span class="custom-tree-node" :class="{ 'mount-offline': nodeData.isMount && nodeData.mountStatus === 'offline' }" @dblclick.stop="handleHostOpen(nodeData.data)" @mouseenter="showExtend = true" @mouseleave="showExtend = false">
            <NSpace>
              <!-- 挂载点节点 -->
              <template v-if="nodeData.isMount">
                <n-icon v-if="nodeData.mountStatus === 'loading'" name="loading" class="mount-loading" />
                <!-- 离线/错误：显示类型图标（红色）+ 离线标记 -->
                <template v-else-if="nodeData.mountStatus === 'offline' || nodeData.mountStatus === 'error'">
                  <n-icon v-if="nodeData.mountType === 'sftp'" name="server" class="mount-error" />
                  <n-icon v-else-if="nodeData.mountType === 'webdav'" name="cloud" class="mount-error" />
                  <n-icon v-else name="folder-client" class="mount-error" />
                  <span class="mount-offline-dot">●</span>
                </template>
                <!-- 在线挂载点 -->
                <n-icon v-else-if="nodeData.mountType === 'sftp'" name="server" />
                <n-icon v-else-if="nodeData.mountType === 'webdav'" name="cloud" />
                <n-icon v-else name="folder-client" />
              </template>
              <!-- 普通节点 -->
              <n-icon v-else-if="nodeData.type === 'node'" :name="nodeData.icon" />
              <!-- 文件夹节点 -->
              <n-icon v-else-if="nodeData.type === 'folder'" :name="`${node.expanded ? 'folder-client-open' : 'folder-client'}`" />
              <span :title="node.label || '-'">{{ node.label }}</span>
              <span v-if="nodeData.isMount && nodeData.mountStatus === 'loading'" class="mount-status-text">{{ $t('mount.status.loading') }}</span>
              <span v-if="nodeData.isMount && nodeData.mountStatus === 'offline'" class="mount-status-text mount-status-error">{{ $t('mount.status.offline') }}</span>
            </NSpace>
            <span v-show="showExtend && !nodeData.isMount" class="session-extend" style="--n-hover-bg-color: #00000018">
              <el-tooltip v-if="nodeData.type === 'node' && nodeData.protocol === 'ssh'" effect="dark" :content="$t('home.sessions-context-menu.sftp')" placement="top-start">
                <NxButton icon="folder-sftp-open" @click.stop="handleOpenSFTP(nodeData.data)" />
              </el-tooltip>
              <NxButton icon="Delete" @click.stop="handleDelete(nodeData.data._id)" />
            </span>
          </span>
        </template>
      </el-tree>
      <el-empty v-show="menuTree.length === 0" :description="t('home.host-manager.session-tree.no-session-data')" />
    </el-scrollbar>
    <!-- 编辑文件夹 -->
    <NxFolderDialog ref="folderDialogRef" />
    <!-- 编辑及新建会话弹窗 -->
    <component :is="sessionModal" ref="sessionModalRef" />
    <!-- 挂载点管理 -->
    <MountManager v-model="mountManagerVisible" @change="handleMountChange" />
  </div>
</template>

<style lang="scss">
//:deep(.collapse-transition) {
//  transition: none !important;
//}
.nx-menu-wrapper {
  position: relative;
  height: 100%;
  background-color: var(--n-bg-color-base);

  .el-scrollbar {
    background-color: var(--n-bg-color-base) !important;
  }

  .el-scrollbar__view {
    background-color: var(--n-bg-color-base) !important;
  }

  .el-empty {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    .el-empty__description {
      p {
        color: var(--n-text-color-base);
      }
    }
  }

  .pt-tree {
    .nx-menu-item {
      padding-top: 5px;
      padding-right: 3px;
      padding-left: 4px;

      .pt-tree-item {
        border-radius: 4px;
        color: var(--n-text-color-base);

        .session-extend {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          column-gap: 5px;
          box-sizing: border-box;
          border-radius: 4px;
        }
      }
    }
  }

  .n-content-menu {
    position: absolute;
    top: 0;
    left: 0;
    color: #ffffff;
    padding: 10px;
    border-radius: 4px;

    background-color: var(--n-color-modal);
  }
}

.el-tree {
  color: var(--n-text-color-base);
  background-color: var(--n-bg-color-base) !important;
  padding: 5px;
  margin-right: 8px;

  &.el-tree--highlight-current {
    .el-tree-node.is-current > .el-tree-node__content {
      background-color: var(--n-hover-bg-color) !important;
    }
  }

  .el-tree-node {
    .el-tree-node__content {
      height: 32px;
      background-color: var(--n-bg-color-base) !important;

      .el-tree-node__expand-icon {
        font-size: 18px;
      }
    }
  }
}

// 挂载点状态样式
.mount-loading {
  animation: spin 1s linear infinite;
  color: var(--el-color-primary);
}

.mount-error {
  color: var(--el-color-danger);
}

.mount-offline-dot {
  color: var(--el-color-danger);
  font-size: 8px;
  margin-left: -2px;
  margin-top: -4px;
}

.mount-offline {
  opacity: 0.6;
}

.mount-status-text {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-left: 4px;
}

.mount-status-error {
  color: var(--el-color-danger);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.custom-tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 32px;

  .session-extend {
    display: none;
    align-items: center;
    justify-content: center;
    column-gap: 5px;
    box-sizing: border-box;
    border-radius: 4px;
  }
}

.custom-tree-node:hover .session-extend {
  display: flex;
}
</style>
