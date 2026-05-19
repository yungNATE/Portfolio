<template>
  <div class="contactWrapper">
    <h2>Me contacter</h2>
    <form name="contact" method="POST" data-netlify="true">
      <p>
        <label>Nom <input type="text" name="name" /></label>
      </p>
      <p>
        <label>Email <input type="email" name="email" /></label>
      </p>
      <p>
        <label>Message <textarea name="message"></textarea></label>
      </p>
      <p>
        <button type="submit">Send</button>
      </p>
    </form>
    <a href="#intro">Back home</a>
  </div>
</template>

<script lang="ts" setup></script>

<style lang="scss">
.contactWrapper {
  height: auto;

  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 50px;
}
</style>
