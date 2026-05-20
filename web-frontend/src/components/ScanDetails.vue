<template>
    <div class="window" style="min-width: fit-content; box-sizing: border-box;">
        <h2>Scan details</h2>

        <div v-if="errorMessage">{{ errorMessage }}</div>

        <div v-if="scan">
            <div class="position">
                <label>Network name:</label>
                <span>{{ scan.network?.ssid }}</span>
            </div>
            <div class="position">
                <label>BSSID:</label>
                <span>{{ scan.network?.bssid }}</span>
            </div>
            <div class="position">
                <label>Scan date:</label>
                <span>{{ formatDate(scan.started_at) }}</span>
            </div>
            <div class="position">
                <label>Upload status:</label>
                <span>{{ scan.server_scan_id ? 'uploaded' : 'not uploaded' }}</span>
            </div>
            <div class="position">
                <label>Scan duration:</label>
                <span>{{ scan.scan_duration_sec }}s</span>
            </div>
            <div class="position">
                <label>Device:</label>
                <span>{{ scan.device_hardware_id }} (fw {{ scan.firmware_version }})</span>
            </div>

            <div>
                <h3>Test results:</h3>
                <div class="list_bg" style="min-width: 100%;">
                    <div class="list" style="max-height: 45rem; overflow-y: auto; pointer-events: auto;">
                        <div v-if="!scan.attacks?.length">No attacks detected</div>
                        <table v-else style="width: 100%;">
                            <span>{{ formatDate(attack.detected_at) }}</span>
                            <tr v-for="(attack, i) in scan.attacks" :key="i">
                                <td style="text-align: left; padding: 0;">{{ attack.attack_type }}</td>
                                <td style="text-align: center; padding: 0;" :class="{
                                    'red': attack.severity === 'CRITICAL' || attack.severity === 'HIGH',
                                    'yellow': attack.severity === 'MEDIUM',
                                    'green': attack.severity === 'LOW'
                                    }">{{ attack.severity }}</td>
                                <td style="text-align: right; padding: 0;">confidence: {{ attack.confidence }}</td>
                            </tr>
                        </table>
                    </div>
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


<style lang="scss">
.position{
    display: flex;
    justify-content: space-between;

    label{
        color: var(--font-light);
    }
}

.red{
    color: var(--red);
}

.yellow{
    color: var(--yellow);
}

.green{
    color: var(--green);
}

button {
    appearance: none;
    border-width: 0;
    background-color: var(--contrast-color);
    padding: 1px 10px 4px 10px;
    border-radius: 5px;
    color: var(--main-color);
    font-size: medium;
    box-shadow: inset 0 -1px 4px;
    transition: all 100ms ease-in;
}

button:hover {
    box-shadow: none;
}

button:disabled{
    background-color: var(--font-light);
}

.buttons{
    display: flex;
    justify-content: space-between;
    padding-top: 1rem;
}

.error{
    color: var(--red);
}

.list{
    border-radius: 1rem;
    box-shadow: inset 0px 1px 4px var(--contrast-color);
    position: relative;
    z-index: auto;
    // pointer-events: none;
    scrollbar-color: var(--main-color) var(--contrast-color);
    scrollbar-width: thin;
}

.list_item{
    z-index: -1;
    padding: 1rem;
    border-radius: 1rem;
    background-color: var(--main-color);
    box-shadow: inset 0px 1px 4px var(--contrast-color);
    box-sizing: border-box;
    position: relative;
    pointer-events: auto;
    

    .description {
        color: var(--font-light);
        width: fit-content;
    }
    .safety_score {
        width: fit-content;
        position: absolute;
        bottom: 0;
        right: 0;
        margin-bottom: -10px;
    }
    
    button{
        height: fit-content;
        position: absolute;
        bottom: 0;
    }
}

.list_item>div{
    position: relative;
}

.list_bg{
    z-index: auto;
    isolation: isolate;
    border-radius: 1rem;
    background-color: var(--contrast-color);
    position: relative;
    // pointer-events: auto;
}
</style>