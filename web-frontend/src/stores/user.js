import { defineStore } from "pinia";    
import { ref } from "vue";  
import axios from "axios";

export const useUserStore = defineStore("user", () => {    
    const user = ref(null)  

    async function fetchUser() {
        const response = await axios.get('/api/v1/users/me', { withCredentials: true });
        user.value = response.data;
    }

    function clearUser() { 
        user.value = null;
    }

    return {
        user,
        fetchUser,
        clearUser
    };
});