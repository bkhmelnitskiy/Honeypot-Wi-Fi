<template>
    <ScanDetails
        v-if="selectedId"
        :id="selectedId"
        @back="selectedId = null"
        @done="selectedId = null"
    />
    <div v-else>
        <h2>My uploaded scans</h2>

        <div>
            <input type="text" v-model="search" placeholder="Search..." />
            <input type="date" v-model="since" />
            <button @click="loadScans()">Filter</button>
        </div>

        <div v-if="errorMessage">{{ errorMessage }}</div>

        <div v-for="scan in filteredScans" :key="scan.server_scan_id">
            <div>{{ scan.network.ssid }}</div>
            <div>BSSID: {{ scan.network.bssid }}</div>
            <div>Scan date: {{ formatDate(scan.started_at) }}</div>
            <div>Upload status: {{ scan.server_scan_id ? 'uploaded' : 'not uploaded' }}</div>
            <div>Score: {{ scan.safety_score }}/100</div>
            <button @click="showDetails(scan)">Details &gt;&gt;</button>
        </div>

        <div>
            <button :disabled="!prevCursor" @click="goPrev">Previous</button>
            <button :disabled="!nextCursor" @click="goNext">Next</button>
            <span>Total: {{ total }}</span>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import ScanDetails from './ScanDetails.vue'

const selectedId = ref(null)
const scans = ref([])
const total = ref(0)
const nextCursor = ref(null)
const prevCursor = ref(null)
const cursor = ref(null)
const perPage = ref(20)
const since = ref('')
const search = ref('')
const errorMessage = ref('')

const filteredScans = computed(() => {
    if (!search.value) return scans.value
    const term = search.value.toLowerCase()
    return scans.value.filter(s =>
        s.network.ssid?.toLowerCase().includes(term) ||
        s.network.bssid?.toLowerCase().includes(term)
    )
})

async function loadScans() {
    try {
        const params = { per_page: perPage.value }
        if (cursor.value) params.cursor = cursor.value
        if (search.value) params.search = search.value
        if (since.value) params.since = since.value

        const response = await axios.get('/api/v1/scans', { params, withCredentials: true })
        scans.value = response.data.scans
        total.value = response.data.total
        nextCursor.value = response.data.next_cursor
        prevCursor.value = response.data.prev_cursor
        errorMessage.value = ''
    } catch (error) {
        errorMessage.value = 'Failed to load scans'
        console.error(error)
    }
}

function goNext() {
    if (!nextCursor.value) return
    cursor.value = nextCursor.value
    loadScans()
}

function goPrev() {
    if (!prevCursor.value) return
    cursor.value = prevCursor.value
    loadScans()
}

function formatDate(iso) {
    return iso ? new Date(iso).toLocaleDateString() : ''
}

function showDetails(scan) {
    selectedId.value = scan.server_scan_id
}

onMounted(loadScans)
</script>
