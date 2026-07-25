import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

export default {
    install: function (app) {
        app.use(ElementPlus, { size: 'small', zIndex: 3000 })
    }
}
