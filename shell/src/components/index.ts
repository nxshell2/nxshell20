/**
 * base functions
 */

import PtToolbar from './bars/toolbar.vue'
import MouseDrag from './base/mouse'

import PtElementResizeDetector from './base/resizedetector'
import PtFile from './file/file.vue'
import PtFolder from './folder/folder.vue'

import PtGridView from './gridview/gridview.vue'
import PtGridViewItem from './gridview/gridviewItem.vue'
import PtList from './list/list.vue'
import PtContextMenu from './menu/contextmenu'
import PtMenu from './menu/menu.vue'
import PtMenuItem from './menu/menuitem.vue'
import PtMenuManager from './menu/menuManager'
import NxButton from './nxButton/index.vue'
import NSpace from './space/index.vue'
import NIcon from './svgicon/index.vue'
import PtXterm from './xterm/xterm'
/** install iconfont */
import './icon/iconfont'

const components = [PtFile, PtFolder, NSpace, NIcon, PtGridView, PtGridViewItem, PtList, PtMenu, PtMenuItem, PtToolbar, PtXterm]
export { NxButton, PtXterm }
export default {
  install(app) {
  app.use(PtElementResizeDetector)
  app.use(PtMenuManager)
  app.use(PtContextMenu)
  app.use(MouseDrag)
  components.forEach(component => app.component(component.name, component))
  }
}
