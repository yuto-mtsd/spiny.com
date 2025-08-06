import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw, RouteLocationNormalized } from "vue-router";

import HomeView from "@/views/HomeView.vue";
import StatsView from "@/views/StatsView.vue";
import LoginView from "@/views/LoginView.vue"; // ✅ ← 追加！
import { getAuth } from "firebase/auth";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "Home",
    component: HomeView,
  },
  {
    path: "/stats",
    name: "Stats",
    component: StatsView,
    props: (route: RouteLocationNormalized) => ({
      allNumber: Number(route.query.time) || 0,
    }),
  },
  {
    path: "/login", // ✅ ← これを追加！
    name: "Login",
    component: LoginView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    const requiresAuth = to.path === "/stats";
  
    if (requiresAuth && !user) {
      next("/login");
    } else {
      next();
    }
  });

export default router;
