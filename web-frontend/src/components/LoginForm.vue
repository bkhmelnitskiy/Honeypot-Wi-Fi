<template>
  <div>
    <h1>Login</h1>
    <form @submit.prevent="handleSubmit">
      <div>
        <label for="email">Email:</label>
        <input type="email" id="email" v-model="email" required />
      </div>
      <div>
        <label for="password">Password:</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <button type="submit">Login</button>
    </form>
    <p>
      don't have an account?
      <a href="#" @click.prevent="emit('switch')">Register here</a>.
    </p>
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
