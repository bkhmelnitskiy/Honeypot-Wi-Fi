<script setup>
import MyScans from '@/components/MyScans.vue'
</script>
<template>
  <main>
    <MyScans />
  </main>
</template>

<style lang="scss">
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
        font-size 160ms ease-in, ;
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

    .window{
        padding: 1rem;
        border-radius: 1rem;
        box-shadow: 0 1px 4px var(--contrast-color);
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

    main{
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>