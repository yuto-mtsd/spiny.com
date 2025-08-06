<!-- src/components/NavBar.vue -->
<template>
    <nav class="navbar">
      <router-link to="/" class="nav-item" :class="{ active: $route.path === '/' }">タイマー</router-link>
      <router-link to="/stats" class="nav-item" :class="{ active: $route.path.startsWith('/stats') }">統計</router-link>
  
      <div class="user-section">
        <span v-if="user">{{ user.displayName || user.email }}</span>
        <button v-if="user" @click="logout" class="nav-item btn-logout">ログアウト</button>
        <router-link v-else to="/login" class="nav-item" :class="{ active: $route.path === '/login' }">ログイン</router-link>
      </div>
    </nav>
  </template>
  
  <script setup>
  import { useRoute, useRouter } from 'vue-router'
  import { ref, onMounted } from 'vue'
  import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
  
  const $route = useRoute()
  const router = useRouter()
  const auth = getAuth()
  
  const user = ref(null)
  
  onMounted(() => {
    onAuthStateChanged(auth, (u) => {
      user.value = u
    })
  })
  
  const logout = async () => {
    await signOut(auth)
    router.push("/login")
  }
  </script>
  
  <style scoped>
  .navbar {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: #f4f4f4;
    border-top: 1px solid #ccc;
    display: flex;
    justify-content: space-around;
    padding: 10px 0;
    z-index: 999;
    align-items: center;
  }
  .nav-item {
    text-decoration: none;
    color: #666;
    font-weight: bold;
    padding: 8px 16px;
    border-radius: 8px;
    transition: 0.2s;
    font-size: 16px;
  }
  .nav-item:hover {
    background-color: #ddd;
  }
  .nav-item.active {
    background-color: #61a61b;
    color: white;
  }
  .user-section {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .btn-logout {
  background-color: #61a61b;
  color: white;
  border: none;
  font-weight: bold;
}
.btn-logout:hover {
  background-color: #4e8f15;
  color: white;
}

  </style>
  