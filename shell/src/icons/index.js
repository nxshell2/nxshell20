import NIcon from '@/components/svgicon/index.vue' // svg component

const req = require.context('./svg', false, /\.svg$/)
const requireAll = requireContext => requireContext.keys().map(requireContext)
requireAll(req)

export default {
    install(app) {
        app.component(NIcon.name, NIcon)
    }
}