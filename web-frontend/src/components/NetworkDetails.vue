<template>
    <div>
        <h2>Network details</h2>

        <div v-if="errorMessage">{{ errorMessage }}</div>

        <div v-if="network">
            <div>
                <label>SSID:</label>
                <span>{{ network.ssid }}</span>
            </div>
            <div>
                <label>BSSID:</label>
                <span>{{ network.bssid }}</span>
            </div>
            <div>
                <label>Channel:</label>
                <span>{{ network.channel }}</span>
            </div>
            <div>
                <label>Encryption:</label>
                <span>{{ network.encryption_type }}</span>
            </div>
            <div>
                <label>Location:</label>
                <span>{{ network.gps_latitude }}, {{ network.gps_longitude }}</span>
            </div>
            <div>
                <label>Total scans:</label>
                <span>{{ network.total_scans }}</span>
            </div>
            <div>
                <label>Users scanned:</label>
                <span>{{ network.total_users_scanned }}</span>
            </div>
            <div>
                <label>Average score:</label>
                <span>{{ network.avg_safety_score }}/100</span>
            </div>
            <div>
                <label>Min score:</label>
                <span>{{ network.min_safety_score }}/100</span>
            </div>
            <div>
                <label>Max score:</label>
                <span>{{ network.max_safety_score }}/100</span>
            </div>

            <div>
                <h3>Scan history:</h3>
                <div v-if="!network.scan_history?.length">No history available</div>
                <div v-for="(entry, i) in network.scan_history" :key="i">
                    <div>
                        <span>{{ entry.date }}</span>
                        <span>Score: {{ entry.safety_score }}/100</span>
                    </div>
                    <div v-for="(attack, j) in entry.attacks" :key="j">
                        <span>{{ attack.attack_type }}</span>
                        <span>{{ attack.severity }}</span>
                        <span>confidence: {{ attack.confidence }}</span>
                    </div>
                </div>
            </div>

            <button @click="emit('back')">Back</button>
            <button @click="emit('done')">Done</button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'

const props = defineProps({
    id: { type: String, required: true }
})
const emit = defineEmits(['back', 'done'])

const network = ref(null)
const errorMessage = ref('')

async function loadNetwork() {
    try {
        const response = await axios.get(`/api/v1/networks/${props.id}`, { withCredentials: true })
        network.value = response.data
        errorMessage.value = ''
    } catch (error) {
        errorMessage.value = 'Failed to load network details'
        console.error(error)
    }
}

onMounted(loadNetwork)
watch(() => props.id, loadNetwork)
</script>
