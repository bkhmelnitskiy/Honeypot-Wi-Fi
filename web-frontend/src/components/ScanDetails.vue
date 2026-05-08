<template>
    <div>
        <h2>Scan details</h2>

        <div v-if="errorMessage">{{ errorMessage }}</div>

        <div v-if="scan">
            <div>
                <label>Network name:</label>
                <span>{{ scan.network?.ssid }}</span>
            </div>
            <div>
                <label>BSSID:</label>
                <span>{{ scan.network?.bssid }}</span>
            </div>
            <div>
                <label>Scan date:</label>
                <span>{{ formatDate(scan.started_at) }}</span>
            </div>
            <div>
                <label>Upload status:</label>
                <span>{{ scan.server_scan_id ? 'uploaded' : 'not uploaded' }}</span>
            </div>
            <div>
                <label>Scan duration:</label>
                <span>{{ scan.scan_duration_sec }}s</span>
            </div>
            <div>
                <label>Device:</label>
                <span>{{ scan.device_hardware_id }} (fw {{ scan.firmware_version }})</span>
            </div>

            <div>
                <h3>Test results:</h3>
                <div v-if="!scan.attacks?.length">No attacks detected</div>
                <div v-for="(attack, i) in scan.attacks" :key="i">
                    <span>{{ attack.attack_type }}</span>
                    <span>{{ attack.severity }}</span>
                    <span>confidence: {{ attack.confidence }}</span>
                    <span>{{ formatDate(attack.detected_at) }}</span>
                </div>
            </div>

            <div>
                <label>Security score:</label>
                <span>{{ scan.safety_score }}/100</span>
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

const scan = ref(null)
const errorMessage = ref('')

async function loadScan() {
    try {
        const response = await axios.get(`/api/v1/scans/${props.id}`, { withCredentials: true })
        scan.value = response.data
        errorMessage.value = ''
    } catch (error) {
        errorMessage.value = 'Failed to load scan details'
        console.error(error)
    }
}

function formatDate(iso) {
    return iso ? new Date(iso).toLocaleString() : ''
}

onMounted(loadScan)
watch(() => props.id, loadScan)
</script>
