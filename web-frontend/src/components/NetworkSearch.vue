<template>
    <NetworkDetails
        v-if="selectedId"
        :id="selectedId"
        @back="selectedId = null"
        @done="selectedId = null"
    />
    <div v-else>
        <h2>Network search</h2>

        <div>
            <input type="text" v-model="search" placeholder="Network name" />
            <input type="text" v-model="bssid" placeholder="BSSID" />
            <input type="text" v-model="location" placeholder="Location (lat,lng)" />
            <input type="number" v-model.number="radiusKm" placeholder="Radius (km)" />
            <input type="number" v-model.number="minScans" placeholder="Min scans" />
            <select v-model="sort">
                <option value="">Sort by</option>
                <option value="safety_score">Safety score</option>
                <option value="total_scans">Total scans</option>
                <option value="last_scanned_at">Last scanned</option>
                <option value="ssid">SSID</option>
            </select>
            <select v-model="order">
                <option value="">Order</option>
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
            </select>
            <button @click="loadNetworks()">Filter</button>
            <button @click="loadNetworks()">Search</button>
        </div>

        <div v-if="errorMessage">{{ errorMessage }}</div>

        <div v-for="network in networks" :key="network.id">
            <div>{{ network.ssid }}</div>
            <div>BSSID: {{ network.bssid }}</div>
            <div>Last scanned: {{ formatDate(network.last_scanned_at) }}</div>
            <div>Total scans: {{ network.total_scans }}</div>
            <div>Top attacks: {{ network.top_attacks?.join(', ') || 'none' }}</div>
            <div>Average score: {{ network.avg_safety_score }}/100</div>
            <button @click="showDetails(network)">Details &gt;&gt;</button>
        </div>

        <div>
            <button :disabled="!prevCursor" @click="goPrev">Previous</button>
            <button :disabled="!nextCursor" @click="goNext">Next</button>
            <span>Total: {{ total }}</span>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import NetworkDetails from './NetworkDetails.vue'

const selectedId = ref(null)
const networks = ref([])
const total = ref(0)
const nextCursor = ref(null)
const prevCursor = ref(null)
const cursor = ref(null)
const perPage = ref(20)

const search = ref('')
const bssid = ref('')
const location = ref('')
const radiusKm = ref(null)
const minScans = ref(null)
const sort = ref('')
const order = ref('')

const errorMessage = ref('')

function parseLocation() {
    if (!location.value) return { lat: null, lng: null }
    const [lat, lng] = location.value.split(',').map(s => parseFloat(s.trim()))
    return { lat: isNaN(lat) ? null : lat, lng: isNaN(lng) ? null : lng }
}

async function loadNetworks() {
    try {
        const params = { per_page: perPage.value }
        if (cursor.value) params.cursor = cursor.value
        if (search.value) params.search = search.value
        if (bssid.value) params.bssid = bssid.value
        if (sort.value) params.sort = sort.value
        if (order.value) params.order = order.value
        if (minScans.value) params.min_scans = minScans.value
        if (radiusKm.value) params.radius_km = radiusKm.value

        const { lat, lng } = parseLocation()
        if (lat !== null) params.lat = lat
        if (lng !== null) params.lng = lng

        const response = await axios.get('/api/v1/networks', { params, withCredentials: true })
        networks.value = response.data.networks
        total.value = response.data.total
        nextCursor.value = response.data.next_cursor
        prevCursor.value = response.data.prev_cursor
        errorMessage.value = ''
    } catch (error) {
        errorMessage.value = 'Failed to load networks'
        console.error(error)
    }
}

function goNext() {
    if (!nextCursor.value) return
    cursor.value = nextCursor.value
    loadNetworks()
}

function goPrev() {
    if (!prevCursor.value) return
    cursor.value = prevCursor.value
    loadNetworks()
}

function formatDate(iso) {
    return iso ? new Date(iso).toLocaleDateString() : ''
}

function showDetails(network) {
    selectedId.value = network.id
}

onMounted(loadNetworks)
</script>
