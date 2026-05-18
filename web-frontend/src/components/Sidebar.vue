<template>
    <aside>
        <router-link class="button" to="/account">
            <IconAccount class="icon"/>
        </router-link>
        <router-link class="button" to="/">
            <IconDashboard class="icon"/>
        </router-link>
        <router-link class="button" to="/scans">
            <IconClock class="icon"/>
        </router-link>
        <router-link class="button" to="rankings">
            <IconRankings class="icon"/>
        </router-link>
        <router-link class="button" to="/networks">
            <IconNetSearch class="icon"/>
        </router-link>
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
    justify-content: space-between;
    min-width: var(--sidebar-icon-width);
    width: var(--sidebar-icon-width);
    min-height: calc(100svh - 7rem);
    overflow: hidden;
    padding: 3.5rem 1.5rem;
    z-index: 100;
    background-color: var(--contrast-color);
    color: var(--main-color);
}

.button {
    color: var(--main-color);
    text-align: center;
    font-size: small;
    margin: 0;
}

.icon {
    stroke-width: 5;
    width: var(--sidebar-icon-width);
    color: var(--main-color);
    transition: all 160ms ease-in;
}

.icon:hover {
    //color: var(--contrast-color);
    // filter: drop-shadow( 0px 0px 4px 15px #fff);
    //background-color: var(--main-color);
    transition: all 160ms ease-in;
    filter: drop-shadow( 0px 0px 3px #fff);
}

// .icon:hover ~ svg.icon {
//     filter: drop-shadow( 0px 0px 4px 15px #fff);
// }

p {
    width: 96px;
    color: var(--main-color);
    margin-top: 0;
}
</style>