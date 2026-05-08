<template>
    <div>
        <h1> Register</h1>
        <form @submit.prevent="handleSubmit">   
            <div>
                <label for="username">Username:</label>
                <input type="text" id="username" v-model="username" required />
            </div>
            <div>
                <label for="email">Email:</label>
                <input type="email" id="email" v-model="email" required />
            </div>
            <div>
                <label for="password">Password:</label>
                <input type="password" id="password" v-model="password" required />
            </div>
            <div>
                <label for="repeat-password">Repeat Password:</label>
                <input type="password" id="repeat-password" v-model="repeatPassword" required />
            </div>
            <button type="submit">Register</button>
        </form> 
        <p>
            already have an account?        
            <a href="#" @click.prevent="emit('switch')">Login here</a>.
        </p>     
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