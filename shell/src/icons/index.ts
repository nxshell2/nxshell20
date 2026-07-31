import NIcon from '@/components/svgicon/index.vue' // svg component

const req = (require as any).context('./svg', false, /\.svg$/);
const requireAll = (requireContext: any) => requireContext.keys().map(requireContext);
requireAll(req);

export default {
    install(app: any) {
        app.component(NIcon.name, NIcon)
    }
}