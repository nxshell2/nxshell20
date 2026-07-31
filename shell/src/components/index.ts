/**
 * base functions
 */

import PtElementResizeDetector from "./base/resizedetector"
import MouseDrag from "./base/mouse"

/** install iconfont */
import "./icon/iconfont"
import PtFile from "./file/file.vue"
import PtFolder from "./folder/folder.vue"

import PtGridView from "./gridview/gridview.vue"
import PtGridViewItem from "./gridview/gridviewItem.vue"
import PtList from "./list/list.vue"
import PtMenu from "./menu/menu.vue"
import PtMenuItem from "./menu/menuitem.vue"
import PtToolbar from "./bars/toolbar.vue"
import PtXterm from "./xterm/xterm"
import PtMenuManager from "./menu/menuManager"
import PtContextMenu from "./menu/contextmenu"
import NSpace from "./space/index.vue"
import NIcon from "./svgicon/index.vue"
import NxButton from "./nxButton/index.vue"

const components = [PtFile, PtFolder, NSpace, NIcon, PtGridView, PtGridViewItem, PtList, PtMenu, PtMenuItem, PtToolbar, PtXterm]
export { NxButton, PtXterm }
export default {
	install(app) {
		app.use(PtElementResizeDetector)
		app.use(PtMenuManager)
		app.use(PtContextMenu)
		app.use(MouseDrag)
		components.forEach((component) => app.component(component.name, component))
	}
}
