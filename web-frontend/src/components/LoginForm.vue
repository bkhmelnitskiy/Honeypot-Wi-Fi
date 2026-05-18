<template>
  <div class="window">
    <h1>Login</h1>
    <form @submit.prevent="handleSubmit">
      <div style="margin-top: 1rem; margin-bottom: -0.5rem;">
        <input type="email" id="email" class="form_input" placeholder="" v-model="email" required />
        <label for="email" class="form_label">Email</label>
      </div>
      <div style="margin-bottom: -1rem;">
        <input type="password" id="password" class="form_input" placeholder="" v-model="password" required />
        <label for="password" class="form_label">Password</label>
      </div>
      <p style="font-size: small; color: var(--font-light); margin-bottom: 8px;">
        Don't have an account?
        <a href="#" @click.prevent="emit('switch')">Register here</a>.
      </p>
      <button type="submit">Login</button>
    </form>
    <p>{{ responseMessage }}</p>
  </div>
</template>

<script setup>
const props = defineProps({
  switchMessage: String,
})
const emit = defineEmits(['switch'])

import { ref } from 'vue'
import axios from 'axios'
const responseMessage = ref('')
const email = ref('')
const password = ref('')
responseMessage.value = props.switchMessage

async function handleSubmit() {
  try {
    await axios.post('/api/v1/auth/login', {
      email: email.value,
      password: password.value,
    })
    alert('Login successful!')
  } catch (error) {
    if (error.response && error.response.status === 401) {
      responseMessage.value = 'Invalid email or password'
    } else {
      if (error.response && error.response.status === 429) {
        responseMessage.value = 'too many login attempts, please try again later'
      } else if (error.response && error.response.status === 422) {
        responseMessage.value = 'Login data is invalid'
      } else {
        responseMessage.value = 'An error occurred during login'
      }
    }
  }
}
</script>
