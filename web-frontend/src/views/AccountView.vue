<template>
    <div>
        <h1>Account Information</h1>
        <p>Email: {{ userStore.user?.email }}</p>
        <p>Username: {{ userStore.user?.display_name }}</p>
        <p>Date Joined: {{ userStore.user?.created_at ? new Date(userStore.user.created_at).toLocaleDateString() : '' }}</p>
        <p>Total Scans: {{ userStore.user?.total_scans }}</p>       
        <p>Networks Scanned: {{ userStore.user?.total_networks_scanned }}</p>
    </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
</script>   