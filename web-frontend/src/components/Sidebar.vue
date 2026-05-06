<template>
    <aside>
        <div class="menu">
            <router-link class="button" to="/account">
                <IconBase /> Account
            </router-link>
            <router-link class="button" to="/">
                <IconAccount/> Dashboard
            </router-link>
            <router-link class="button" to="/scans">
                <IconAccount/> My scans
            </router-link>
            <router-link class="button" to="rankings">
                <IconAccount/> Rankings
            </router-link>
            <router-link class="button" to="/networks">
                <IconAccount/> Network search
            </router-link>
        </div>
    </aside>
</template>

<script setup>
    import IconBase from "./icons/IconBase.vue"
    import IconAccount from "./icons/IconAccount.vue"
    import IconClock from "./icons/IconClock.vue"
    import IconRankings from "./icons/IconRankings.vue"
</script>

<style lang="scss" scoped>
aside {
    display:flex;
    flex-direction: column;
    width: calc(2rem + var(--sidebar-icon-width));
    min-height: 100vh;
    overflow: hidden;
    padding: 1rem;

    background-color: var(--contrast-color);
    color: var(--main-color);
}
button{
    color: var(--main-color);
}
</style>