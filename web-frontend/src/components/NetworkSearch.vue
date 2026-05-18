<template>
    <NetworkDetails
        v-if="selectedId"
        :id="selectedId"
        @back="selectedId = null"
        @done="selectedId = null"
    />
    <div v-else class="network_details window" style="min-width: 40rem; max-width: 60rem;">
        <h2>Network search</h2>

        <form style="margin-bottom: 1rem;">
            <div class="form_item">
                <input id="network_name" type="text" v-model="search" class="form_input" placeholder="" />
                <label for="network_name" class="form_label">Network name</label>
            </div>
            <div class="form_item">
                <input id="bssid" type="text" v-model="bssid" class="form_input" placeholder="" />
                <label for="bssid" class="form_label">BSSID</label>
            </div>
            <div class="form_item">
                <input id="location" type="text" v-model="location" class="form_input" placeholder="" />
                <label for="location" class="form_label">Location (lat,lng)</label>
            </div>
            <div class="form_item">
                <input id="radius" type="number" v-model.number="radiusKm" class="form_input" placeholder="" />
                <label for="radius" class="form_label">Radius (km)</label>
            </div>
            <div class="form_item">
                <input id="min_scans" type="number" v-model.number="minScans" class="form_input" placeholder="" />
                <label for="min_scans" class="form_label">Min scans</label>
            </div>
            <select v-model="sort" style="padding-left: 1rem; width: calc(30% - 1rem);">
                <option value="">Sort by</option>
                <option value="safety_score">Safety score</option>
                <option value="total_scans">Total scans</option>
                <option value="last_scanned_at">Last scanned</option>
                <option value="ssid">SSID</option>
            </select>
            <select v-model="order" style="padding-left: 1rem; width: calc(20% - 0.5rem);">
                <option value="">Order</option>
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
            </select>
            <button @click="loadNetworks()">Search</button>
        </form>

        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

        <div class="list">
            <div v-for="network in networks" :key="network.id" class="list_item">
                <div>{{ network.ssid }}</div>
                <div>BSSID: {{ network.bssid }}</div>
                <div>Last scanned: {{ formatDate(network.last_scanned_at) }}</div>
                <div>Total scans: {{ network.total_scans }}</div>
                <div>Top attacks: {{ network.top_attacks?.join(', ') || 'none' }}</div>
                <div>Average score: {{ network.avg_safety_score }}/100</div>
                <button @click="showDetails(network)">Details &gt;&gt;</button>
            </div>
            list placeholder!
        </div>
        

        <nav class="buttons">
            <button :disabled="!prevCursor" @click="goPrev">Previous</button>
            <span>Total: {{ total }}</span>
            <button :disabled="!nextCursor" @click="goNext">Next</button>
        </nav>
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

<style lang="scss">
.network_details{
    input {
        box-sizing: border-box;
        appearance: none;
        border: none;
        border-color: rgba(255,255,255,0);
        outline: none;
        border-width: 0;
        box-shadow: 0 1px 4px var(--contrast-color);
        padding: 1px 10px 3px 10px;
        border-radius: 3px;
        width: 100%;
        height: auto;
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

    a:link {
        color: var(--contrast-color);
        transition: all 160ms ease-in;
    }

    a:hover {
        text-decoration: none;
        transition: all 160ms ease-in;
    }

    .form_input {
        font-family: inherit;
        font-size: large;
        transition: all 160ms ease-in;
        color: var(--font-dark);
        padding: 1rem;
    }

    .form_input:focus{
        appearance: none;
        outline: none;
        border: 1.5px solid var(--contrast-color);
        }

    .form_label {
        position: relative;
        left: 1rem;
        top: -2.6rem;
        color: var(--font-light);
        font-size: large;
        cursor: text;
        background-color: rgba(255, 255, 255, 0);
        border: none;
        border-color: rgba(255,255,255,0);
        outline: none;
        border-width: 0;

        transition: all 100ms ease-in, top 160ms ease-in, left 145ms ease-in,
        font-size 160ms ease-in;
        pointer-events: none;
    }

    .form_input:focus ~ .form_label,
    .form_input:not(:placeholder-shown).form_input:not(:focus) ~ .form_label {
        position: relative;
        top: -4.5rem;
        left: 0rem;
        font-size: 0.8rem;
        background-color: rgba(120, 202, 233, 255);
        color: var(--main-color);
        padding: 1px 5px 3px 5px;
        border-radius: 10px;
    }

    .form_item{
        width: calc(50% - 0.5rem);
        margin-bottom: -0.75rem;
    }

    select{
        font-family: inherit;
        font-size: large;
        color: var(--font-light);
        border-radius: 3px;
        border: none;
        height: 58px;
        box-shadow: 0 1px 4px var(--contrast-color);
        background-color: var(--main-color);
        transition: all 160ms ease-in;
    }
    
    select:focus-visible{
        outline-color: var(--contrast-color);
    }

    option{
        appearance: none;
        background-color: var(--main-color);
        color: var(--font-light);
    }

    option:checked{
        color: var(--contrast-color);
    }

    option:read-write{
        color: var(--red);
    }

    form {
        width: 100%;
        box-sizing: border-box;
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        margin-top: 1rem;
    }

    input[type="date"] {
        font-size: medium;
        color: var(--font-light);
        padding: 1rem;
    }

    .error{
        color: var(--red)
    }

    button:disabled{
        background-color: var(--font-light);
    }

    .buttons{
        display: flex;
        justify-content: space-between;
        padding-top: 1rem;
    }

    .buttons > span {
        color: var(--font-light);
    }

    .list{
        z-index: 2;
        border-radius: 1rem;
        box-shadow: inset 0px 1px 4px var(--contrast-color);
    }

    .list_item{
        z-index: 1;
        padding: 1rem;
    }
}

.window{
        box-sizing: border-box;
        width: 100%;//calc(100% - var(--sidebar-icon-width) - 2rem);
        padding: 1rem;
        border-radius: 1rem;
        box-shadow: 0 1px 4px var(--contrast-color);
        min-width: 40rem;
        max-width: 60rem;
    }
</style>