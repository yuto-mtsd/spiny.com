// src/main.ts
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
// main.ts
import './style.css'; // ✅ これがあればOK


createApp(App).use(router).mount("#app");
