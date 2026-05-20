<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import axios from 'axios'
import Sidebar from '@/components/Sidebar.vue'

const userStore = useUserStore()
const router = useRouter()

</script>

<template>
  <header>
    <div class="app">
      <Sidebar />

      <RouterView />
    </div>
  </header>

  
</template>

<style lang="scss">
:root {
    --main-color: white;
    --contrast-color: rgb(120, 202, 233);
    --font-dark: #505050;
    --font-light: #B2B2B2;
    --red: #DF6F6F;
    --yellow: #EFD775;
    --green: #6ECE7E;
    --sidebar-icon-width: 128px;
}

*, *::before, *::after { margin: 0; padding: 0; }

* {
  font-family: "Michroma", sans-serif;
  font-weight: 400;
  font-style: normal;
}

*::selection{
  background: rgba(120, 202, 233, 0.5);
}

html,
body {
  margin: 0;
  padding: 0;
}

.app{
    display: flex;
    color: var(--font-dark);
    main {
        display: flex;
        flex: 1 1 0;
        padding: 2rem;
    }
}
</style>
