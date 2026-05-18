<template>
    <div class="window">
        <h1> Register</h1>
        <form @submit.prevent="handleSubmit">   
            <div style="margin-top: 1rem; margin-bottom: -0.5rem;">
                <input type="text" id="username" class="form_input" placeholder="" v-model="username" required />
                <label for="username" class="form_label">Username</label>
            </div>
            <div style="margin-bottom: -0.5rem;">
                <input type="email" id="email" class="form_input" placeholder="" v-model="email" required />
                <label for="email" class="form_label">Email</label>
            </div>
            <div style="margin-bottom: -0.5rem;">
                <input type="password" id="password" class="form_input" placeholder="" v-model="password" required />
                <label for="password" class="form_label">Password</label>
            </div>
            <div style="margin-bottom: -0.75rem;">
                <input type="password" id="repeat-password" class="form_input" placeholder="" v-model="repeatPassword" required />
                <label for="repeat-password" class="form_label">Repeat password</label>
            </div>
            <p style="font-size: small; color: var(--font-light); margin-bottom: 8px;">
                Already have an account?        
                <a href="#" @click.prevent="emit('switch')">Login here</a>.
            </p>  
            <button type="submit">Register</button>
        </form>    
        <p>{{ responseMessage }}</p>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const emit = defineEmits(['switch']);
const responseMessage = ref('');
responseMessage.value = '';
const username = ref('');
const email = ref('');
const password = ref('');
const repeatPassword = ref(''); 

async function handleSubmit() {
    try{
        if (password.value !== repeatPassword.value) {
            alert('Passwords do not match!');
            return;
        }
        await axios.post('/api/v1/auth/register', {
            email: email.value,
            password: password.value,
            display_name: username.value
        });
        alert('Registration successful!'); 
        emit('switch', 'Registration successful! Please log in.'); 
    }
    catch (error) {
        if (error.response && error.response.status === 422) {
            responseMessage.value = 'Login data is invalid or email is already in use';
        } else
        if (error.response && error.response.status === 429) {
            responseMessage.value = 'too many registration attempts, please try again later';   
        } else {
            responseMessage.value = 'An error occurred during registration.';
        }
    }
}
</script>