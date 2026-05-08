import { defineStore } from "pinia";    
import { ref } from "vue";  
import axios from "axios";

export const useGlobalStatsStore = defineStore("globalStats", () => {    
    const globalStats = ref(null)  

    async function fetchGlobalStats() {
        const response = await axios.get('/api/v1/stats/global', { withCredentials: true });
        globalStats.value = response.data;
    }


    return {
        globalStats,
        fetchGlobalStats,
    };
});