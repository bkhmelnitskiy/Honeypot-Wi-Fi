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
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('../views/AuthView.vue'),
      meta: { public: true },
    }
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.public) {
    const userStore = useUserStore()
    try {
      await userStore.fetchUser()
    } catch {
      return { name: 'auth' }
    }
  }
})

export default router
