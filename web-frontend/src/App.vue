<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import axios from 'axios'
import Sidebar from './components/Sidebar.vue'

const userStore = useUserStore()
const router = useRouter()

async function handleLogout() {
  try {
    await axios.post('/api/v1/auth/logout', {}, { withCredentials: true })
  } finally {
    userStore.clearUser()
    router.push({ name: 'auth' })
  }
}
</script>

<template>
  <header>
    <div class="app">
      <Sidebar />

      <RouterView />
    </div>
    <!-- <nav class="sidebar">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/scans">My Scans</RouterLink>
      <RouterLink to="/auth">Login</RouterLink>
      <RouterLink to="/account">Account</RouterLink>  
      <RouterLink to="/networks">Networks</RouterLink>
      <RouterLink to="/rankings">Rankings</RouterLink>
      <a href="#" @click.prevent="handleLogout">Logout</a>  
    </nav> -->
  </header>

  
</template>

<style lang="scss">
:root {
    --main-color: white;
    --contrast-color: #78CAE9;
    --font-dark: #505050;
    --font-light: #B2B2B2;
    --sidebar-icon-width: 96px;
}
* {
  font-family: "Michroma", sans-serif;
  font-weight: 400;
  font-style: normal;
  color: var(--font-dark);
}

body {
  margin: 0;
  padding: 0;
}

.sidebar.icon {
    stroke-width: 5;
    stroke: var(--main-color)
}

.sidebar.icon.highlighted {
    stroke: var(--contrast-color);
    box-shadow: 0px 0px 4px 15px var(--main-color);
}

.app{
    display: flex;

    main {
        flex: 1 1 0;
        padding: 2rem;
    }
}
</style>
