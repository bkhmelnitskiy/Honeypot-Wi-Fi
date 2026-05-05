<template>
<LoginForm v-if="mode === 'login'" @switch="handleSwitch" />
<RegisterForm v-else @switch="handleSwitch" />
</template>

<script setup>
import LoginForm from '@/components/LoginForm.vue'; 
import RegisterForm from '@/components/RegisterForm.vue';   
import {ref} from 'vue';
const mode = ref('login');
const switchMessage = ref('');

function handleSwitch(message = '') {
    switchMessage.value = message;
    mode.value = mode.value === 'login' ? 'register' : 'login'; 
}

</script>   