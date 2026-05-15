<template>
    <aside>
        <div class="menu">
            <router-link class="button" to="/account">
                <IconAccount/> <p>Account</p>
            </router-link>
            <router-link class="button" to="/">
                <IconDashboard/> <p>Dashboard</p>
            </router-link>
            <router-link class="button" to="/scans">
                <IconClock/> <p>My scans</p>
            </router-link>
            <router-link class="button" to="rankings">
                <IconRankings/> <p>Rankings</p>
            </router-link>
            <router-link class="button" to="/networks">
                <IconNetSearch/> <p>Network search</p>
            </router-link>
        </div>
    </aside>
</template>

<script setup>
    import IconAccount from "./icons/IconAccount.vue"
    import IconClock from "./icons/IconClock.vue"
    import IconRankings from "./icons/IconRankings.vue"
    import IconDashboard from "./icons/IconDashboard.vue"
    import IconNetSearch from "./icons/IconNetSearch.vue"
</script>

<style lang="scss" scoped>

aside {
    display:flex;
    flex-direction: column;
    width: var(--sidebar-icon-width);
    min-height: 100vh;
    overflow: hidden;
    padding: 1.5rem;

    background-color: var(--contrast-color);
    color: var(--main-color);
}

.button {
    color: var(--main-color);
    text-align: center;
    padding-top: 2rem;
    font-size: small;
    margin: 0;
}

.icon {
    width: var(--sidebar-icon-width);
}

.menu {
    margin: 0;
    padding: 0;
    width: 96px;
}

p {
    width: 96px;
    color: var(--main-color);
    margin-top: 0;
}
</style>