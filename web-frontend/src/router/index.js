import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { public: true },
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('../views/AccountView.vue'),  
    },
    {
      path: '/scans',
      name: 'MyScans',
      component: () => import('../views/MyScansView.vue'),
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('../views/AuthView.vue'),
      meta: { public: true },
    },
    {
      path: '/networks',
      name: 'networks',
      component: () => import('../views/NetworksView.vue'),
    },
    {
      path: '/rankings',
      name: 'rankings',
      component: () => import('../views/RankingsView.vue'),
    }
  ],
})

router.beforeEach(async (to) => {
  const userStore = useUserStore()

  if (to.name === 'auth') {
    try {
      await userStore.fetchUser()
      return { name: 'account' }
    } catch {
      return
    }
  }

  if (!to.meta.public) {
    try {
      await userStore.fetchUser()
    } catch {
      return { name: 'auth' }
    }
  }
})

export default router
