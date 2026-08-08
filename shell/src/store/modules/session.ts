import { defineStore } from 'pinia'
import { onMounted, reactive, ref } from 'vue'
import sessionManager from '@/services/sessionMgr'
import mountManager from '@/services/storage/mountManager'

export interface IMenuNode {
  id: number
  uuid: string
  text: string
  icon: string
  isFolder: boolean
  isMount?: boolean
  mountId?: string
  mountType?: string
  mountStatus?: string
  readonly?: boolean
  type: string
  protocol: string
  data: Record<string, any>
  children?: IMenuNode[]
}

interface IGroupProps {
  value: number
  label: string
}

export interface ITreeNode {
  sessionId: number | undefined
  protocol: string
  label: string
  isFolder: boolean
  node: any | undefined
  sessionData: Record<string, any> | undefined
  nodeElement: any
}

const useSessionStore = defineStore('session', () => {
  const group = ref<IGroupProps[]>([])
  const menuTree = ref<IMenuNode[]>([])
  const search = ref<boolean>(false)
  const currentNode = reactive<ITreeNode>({
  sessionId: undefined,
  protocol: '',
  label: '',
  isFolder: false,
  node: undefined,
  sessionData: undefined,
  nodeElement: undefined
  })

  const keyboardToAll = ref(false)

  /**
		 * 匹配查找
		 *
		 * @param name 菜单名称
		 * @param keyword 关键词
		 * @returns 是否找到
		 */
  const matchFunction = (name: string, keyword?: string) => {
  if (keyword) {
    return new RegExp(keyword, 'i').test(name)
  }
  return true
  }

  /**
		 * 将sessionConfig转化为菜单结构
		 * 查找通用
		 *
		 * @param sessionConfigList 待转换的会话配置列表
		 * @param treeList 菜单树列表
		 * @param keyword 关键词
		 */
  function process(sessionConfigList: any[], treeList: any[], keyword?: string) {
  for (const cfgNode of sessionConfigList) {
    const { _id: id, name, type, config, uuid } = cfgNode
    const treeNode: IMenuNode = {
    id,
    uuid,
    icon: (cfgNode.config && cfgNode.config.system) || 'server',
    text: name,
    isFolder: cfgNode.type === 'folder',
    type,
    protocol: (config && config.protocal) ?? '',
    data: cfgNode.toJSONObject(false)
    }

    const children: IMenuNode[] = []
    if (treeNode.isFolder) {
    process(cfgNode.subSessions, children, keyword)
    treeNode.children = children
    if (!keyword) {
      const groupItem = { value: id, label: name }
      group.value.push(groupItem)
    }
    }
    if (matchFunction(name, keyword) || children.length > 0) {
    treeList.push(treeNode)
    }
  }
  }

  /**
		 * 更新菜单
		 *
		 * @param keyword 关键词
		 */
  function updateProcess(keyword?: string) {
  if (keyword) {
    search.value = true
    menuTree.value.splice(0, menuTree.value.length)
  }
  // 清空数组
  group.value.splice(0)
  menuTree.value.splice(0)

  // 获取所有挂载点根节点
  const mountRoots = sessionManager.getMountRoots()

  if (mountRoots.length === 0) {
    // 兼容旧逻辑：没有挂载点时使用默认
    const sessionConfigs = sessionManager.getSessionConfigs()
    process(sessionConfigs, menuTree.value, keyword)
  } else if (mountRoots.length === 1) {
    // 只有一个挂载点时，直接显示其子会话（不显示挂载点根节点）
    const root = mountRoots[0]
    process(root.subSessions, menuTree.value, keyword)
  } else {
    // 多个挂载点时，显示挂载点作为顶级节点
    for (const mountRoot of mountRoots) {
    const mount = mountManager.getMount(mountRoot.mountId)
    const mountStatus = mount?.status || (mountRoot.mountId === 'local' ? 'online' : 'loading')
    const mountNode: IMenuNode = {
      id: mountRoot._id,
      uuid: mountRoot.uuid,
      icon: getMountIcon(mount?.type || 'local', mountStatus),
      text: mountRoot.name,
      isFolder: true,
      isMount: true,
      mountId: mountRoot.mountId,
      mountType: mount?.type || 'local',
      mountStatus,
      readonly: mount?.readonly || false,
      type: 'folder',
      protocol: '',
      data: mountRoot.toJSONObject(false),
      children: []
    }

    process(mountRoot.subSessions, mountNode.children!, keyword)

    // 搜索时只显示有匹配结果的挂载点
    if (!keyword || mountNode.children!.length > 0) {
      menuTree.value.push(mountNode)
    }
    }
  }
  }

  /**
		 * 获取挂载点图标
		 */
  function getMountIcon(type: string, status?: string): string {
  // 根据状态返回不同图标
  if (status === 'offline' || status === 'error') {
    return 'cloud-offline'
  }
  if (status === 'loading') {
    return 'loading'
  }
  // 根据类型返回图标
  switch (type) {
    case 'webdav': return 'cloud'
    case 'sftp': return 'server'
    case 's3': return 'cloud-storage'
    default: return 'folder-client'
  }
  }

  /**
		 * 更新当前选中的节点
		 *
		 * @param nodeElement menu ref 对象
		 * @param node el-tree Node 节点数据
		 * @param nodeData 会话配置数据
		 */
  function updateCurrentNode(nodeElement: any, node?: any, nodeData?: IMenuNode) {
  currentNode.sessionId = nodeData?.id
  currentNode.protocol = nodeData?.protocol ?? ''
  currentNode.label = nodeData?.text ?? ''
  currentNode.nodeElement = nodeElement
  currentNode.node = node
  currentNode.sessionData = nodeData
  currentNode.isFolder = nodeData?.isFolder ?? false
  }

  /**
   * 添加新的菜单选项
   *
   * @param sessionConfig 会话内容
   */
  async function appendSessionConfig(sessionConfig: any) {
  const { isFolder, sessionData } = currentNode
  await sessionManager.addSessionConfig(isFolder ? sessionData?.data : null, sessionConfig as any)
  updateProcess()
  }

  function updateSendToAllXterm(status: boolean) {
  keyboardToAll.value = status
  }

  onMounted(updateProcess)

  return {
  group,
  menuTree,
  currentNode,
  keyboardToAll,
  updateSendToAllXterm,
  updateProcess,
  appendSessionConfig,
  updateCurrentNode
  }
})
export default useSessionStore
