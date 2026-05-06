import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import axios from 'axios'
axios.defaults.withCredentials = true

let refreshing = null

axios.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config
    const status = error.response?.status

    if (status !== 401 || original._retry || original.url.includes('/auth/')) {
      return Promise.reject(error)
    }

    original._retry = true

    try {
      refreshing = refreshing || axios.post('/api/v1/auth/refresh', {})
      await refreshing
      refreshing = null
      return axios(original)
    } catch (refreshError) {
      refreshing = null
      return Promise.reject(refreshError)
    }
  }
)

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
