<template>
    <ScanDetails
        v-if="selectedId"
        :id="selectedId"
        @back="selectedId = null"
        @done="selectedId = null"
    />
    <div v-else class="window myscans" style="
    min-width: 35rem; 
    max-width: 40rem;
    box-sizing: border-box;
    padding: 1rem;
    border-radius: 1rem;
    box-shadow: 0 1px 4px var(--contrast-color);">
        <h2>My uploaded scans</h2>

        <div id="scan_search">
            <div style="margin-top: 1rem; margin-bottom: -2rem; ">
                <input id="search" type="text" v-model="search" class="form_input" placeholder="" style="margin-right: 1rem;"/>
                <input type="date" v-model="since" style="margin-bottom: 1rem;"/>
                <label for="search" class="form_label">Search</label>
            </div>
            <button @click="loadScans()" style="margin-bottom: 1rem;">Filter</button>
        </div>

        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

        <div class="list_bg" style="min-width: 100%;">
            <div class="list" style="max-height: 45rem; overflow-y: auto;">
                <div v-if="total == 0" class="list_item" style="display:flex; justify-content: center; color: var(--font-light);">You have not uploaded any scans yet.</div>
                <div v-for="scan in filteredScans" :key="scan.server_scan_id" class="list_item">
                    <div class="title">{{ scan.network.ssid }}</div>
                    <div style="padding-bottom: 2rem;">
                        <div class="description">BSSID: {{ scan.network.bssid }}</div>
                        <div class="description">Scan date: {{ formatDate(scan.started_at) }}</div>
                        <div class="description">Upload status: {{ scan.server_scan_id ? 'uploaded' : 'not uploaded' }}</div>
                        <div class="safety_score">Score: <a 
                            class="score"
                            :class="{
                                'red': scan.safety_score < 34,
                                'yellow': scan.safety_score >= 34 && scan.safety_score < 67,
                                'green': scan.safety_score >= 67,
                            }">{{ scan.safety_score }}</a>/100</div>
                        <button @click="showDetails(scan)">Details &gt;&gt;</button>
                    </div>
                    
                </div>
            </div>
        </div>
        

        <nav class="buttons">
            <button :disabled="!prevCursor" @click="goPrev">Previous</button>
            <span>Total: {{ total }}</span>
            <button :disabled="!nextCursor" @click="goNext">Next</button>
        </nav>
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

<style lang="scss">
.myscans{
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
    width: calc(50% - 0.5rem);
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

    button:disabled{
        background-color: var(--font-light);
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
        top: -3.6rem;
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
        top: -5.5rem;
        left: 0rem;
        font-size: 0.8rem;
        background-color: rgba(120, 202, 233, 255);
        color: var(--main-color);
        padding: 1px 5px 3px 5px;
        border-radius: 10px;
    }

    form {
        width: 100%;
    }

    // .window{
    // box-sizing: border-box;
    // width: 100%;//calc(100% - var(--sidebar-icon-width) - 2rem);
    // padding: 1rem;
    // border-radius: 1rem;
    // box-shadow: 0 1px 4px var(--contrast-color);
    // min-width: 30rem;
    // max-width: 60rem;
    // }


    input[type="date"] {
        font-size: medium;
        color: var(--font-light);
        padding: 1rem;
    }
    .error{
        color: var(--red)
    }

    .score{
        // add logic to switch colors
        color: var(--font-dark);
        font-size: 2rem;
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
        
    .buttons{
        display: flex;
        justify-content: space-between;
        padding-top: 1rem;
    }
    .buttons > span {
        color: var(--font-light);
    }

.list{
    border-radius: 1rem;
    box-shadow: inset 0px 1px 4px var(--contrast-color);
    position: relative;
    z-index: auto;
    // pointer-events: none;
    scrollbar-color: var(--main-color) var(--contrast-color);
    scrollbar-width: thin;
    pointer-events: none;
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
        margin-bottom: -8px;
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

.title{
    color: var(--font-dark);
    font-size: large;
}

.description{
    color: var(--font-light);
}
}
</style>
