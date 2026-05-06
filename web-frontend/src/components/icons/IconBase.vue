<template>
    <svg
        :viewBox="viewBox"
        xmlns="http://www.w3c.org/2000/svg"
        :width="width"
        :height="height"
        class="svg-icon"
    >
        <component :is="icon"></component>
    </svg>
</template>

<script lang="ts">
import { defineComponent, computed, Component } from 'vue';

import App from "../../App.vue"

const components: { [key: string]: Component } = {
    app: App,
};

export default defineComponent({
    name: "Icon",
    components,
    props: {
        viewBox: {
            type: String,
            default: "0 0 96 96",
        },
        width: {
            type: String,
            default: "96",
        },
        height: {
            type: String,
            default: "96",
        },
        type: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const icon = computed(() => components[props.type]);

        return{
            icon,
        };
    },
});
</script>