<script setup>
    import { useUserStore } from '@/stores/user'
    const userStore = useUserStore()

    async function handleLogout() {
        try {
            await axios.post('/api/v1/auth/logout', {}, { withCredentials: true })
        } finally {
            userStore.clearUser()
            router.push({ name: 'auth' })
        }
    }
</script>

<template>
    <main>
        <div class="window">
            <h1>Account Information</h1>
            <p>Email: <a>{{ userStore.user?.email }}</a></p>
            <p>Username: <a>{{ userStore.user?.display_name }}</a></p>
            <p>Date Joined: <a>{{ userStore.user?.created_at ? new Date(userStore.user.created_at).toLocaleDateString() : '' }}</a></p>
            <p>Total Scans: <a>{{ userStore.user?.total_scans }}</a></p>       
            <p>Networks Scanned: <a>{{ userStore.user?.total_networks_scanned }}</a></p>
            <button v-on:click="handleLogout()" style="margin-top: 1rem;">Logout</button>
        </div> 
    </main>
</template>


<style lang="scss">
p {
    font-size: large;
    color: var(--font-light);
    padding-top: 0.5rem;
}

a {
    color: var(--font-dark);
}

.window {
    padding: 1rem;
    border-radius: 1rem;
    box-shadow: 0 1px 4px var(--contrast-color);
    min-width: 32rem;
    height: auto;
}

main {
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>