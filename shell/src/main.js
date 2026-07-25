import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import pinia from "./store";

import "@fontsource/dejavu-mono";
import "./assets/scss/default.scss";

import PtComponents from "@/components";
import PtSessionManger from "@/services";

import Element from './element'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import '@/icons'
import initI18n from '@/locals'

const app = createApp(App);

app.use(PtComponents);
app.use(PtSessionManger);
app.use(Element);
app.use(pinia);
app.use(router);

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}

!async function () {
    await PtSessionManger.initService();
    const i18n = await initI18n();
    app.use(i18n);
    app.mount("#app");
}();

window.addEventListener("keydown", (evt) => {
    if (evt.ctrlKey && evt.key === "r") {
        evt.preventDefault();
    }
    if (evt.metaKey && evt.key === "r") {
        evt.preventDefault();
    }
})