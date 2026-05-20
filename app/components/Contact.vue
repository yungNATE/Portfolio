<template>
  <section class="contact" aria-labelledby="contact-title">
    <h2 id="contact-title">Me contacter</h2>

    <form
      name="contact"
      method="POST"
      data-netlify="true"
      netlify-honeypot="bot-field"
      @submit.prevent="onSubmit"
      novalidate
      class="contactForm"
    >
      <input type="hidden" name="form-name" value="contact" />

      <!-- honeypot -->
      <p class="sr-only">
        <label
          >Ne remplissez pas ceci
          <input name="bot-field" v-model="botField" autocomplete="off"
        /></label>
      </p>

      <div class="grid">
        <label class="field">
          <input
            type="text"
            name="name"
            v-model="form.name"
            required
            autocomplete="name"
            :aria-invalid="!!errors.name"
          />
          <span class="floating">Nom</span>
          <span class="error" v-if="errors.name">{{ errors.name }}</span>
        </label>

        <label class="field">
          <input
            type="email"
            name="email"
            v-model="form.email"
            required
            autocomplete="email"
            :aria-invalid="!!errors.email"
          />
          <span class="floating">Email</span>
          <span class="error" v-if="errors.email">{{ errors.email }}</span>
        </label>

        <label class="field full textarea">
          <textarea
            name="message"
            v-model="form.message"
            rows="6"
            required
            :aria-invalid="!!errors.message"
          ></textarea>
          <span class="floating">Message</span>
          <span class="error" v-if="errors.message">{{ errors.message }}</span>
        </label>
      </div>

      <div class="actions">
        <button type="submit" class="a mail" :disabled="isSending">
          <span v-if="!isSending">Envoyer</span>
          <span v-else>Envoi…</span>
        </button>

        <div class="feedback">
          <p class="success" v-if="sent">Merci — message envoyé !</p>
          <p class="error" v-if="submitError">{{ submitError }}</p>
        </div>
      </div>
    </form>
  </section>
</template>

<script lang="ts" setup>
import { reactive, ref } from "vue";

interface FormModel {
  name: string;
  email: string;
  projectType: string;
  website: string;
  message: string;
}

const form = reactive<FormModel>({
  name: "",
  email: "",
  projectType: "",
  website: "",
  message: "",
});

const botField = ref("");
const errors = reactive<Record<string, string>>({});
const isSending = ref(false);
const sent = ref(false);
const submitError = ref("");

function validate() {
  errors.name = form.name.trim() ? "" : "Le nom est requis.";
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || "")
    ? ""
    : "Email invalide.";
  errors.message =
    form.message.trim().length >= 10
      ? ""
      : "Message trop court (≥10 caractères).";
  return !Object.values(errors).some(Boolean);
}

function encode(data: Record<string, string>) {
  return Object.keys(data)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(data[k] || ""))
    .join("&");
}

async function onSubmit() {
  submitError.value = "";
  sent.value = false;

  if (botField.value) return; // honeypot

  if (!validate()) {
    return;
  }

  isSending.value = true;

  const payload: Record<string, string> = {
    "form-name": "contact",
    name: form.name,
    email: form.email,
    projectType: form.projectType,
    website: form.website,
    message: form.message,
  };

  try {
    const res = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode(payload),
    });

    if (res.ok) {
      sent.value = true;
      // clear
      form.name = "";
      form.email = "";
      form.projectType = "";
      form.website = "";
      form.message = "";
    } else {
      submitError.value = "Erreur serveur, réessayez plus tard.";
    }
  } catch (e) {
    submitError.value = "Impossible d'envoyer le message.";
  } finally {
    isSending.value = false;
  }
}
</script>

<style lang="scss" scoped>
.contact {
  max-width: 920px;
  margin: 2rem auto;
  padding: 1.6rem;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.02),
    rgba(255, 255, 255, 0.01)
  );

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    letter-spacing: -0.02em;
  }
}

.contactForm {
  display: grid;
  gap: 1rem;
  animation: fadeInUp 0.45s both ease;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.9rem;
}

.field {
  position: relative;
  display: flex;
  flex-direction: column;

  input[type="text"],
  input[type="email"],
  input[type="url"],
  textarea {
    appearance: none;
    padding: 0.9rem 0.75rem;
    border: 1px solid rgba(60, 70, 90, 0.1);
    background: rgba(255, 255, 255, 0.02);
    color: inherit;
    transition:
      box-shadow 0.18s,
      border-color 0.18s,
      transform 0.12s;
    font-size: 0.95rem;
  }

  textarea {
    resize: vertical;
    min-height: 120px;
  }

  /* floating label */
  .floating {
    position: absolute;
    left: 14px;
    top: 12px;
    pointer-events: none;
    color: #9aa4b2;
    font-size: 0.88rem;
    transform-origin: left top;
    transition:
      transform 0.18s ease,
      top 0.18s ease,
      font-size 0.18s ease,
      color 0.18s ease;
  }

  /* underline focus */
  input:focus,
  textarea:focus {
    box-shadow: 0 6px 18px rgba(80, 110, 255, 0.06);
    border-color: rgba(100, 140, 255, 0.9);
  }

  .error {
    color: #ff6b6b;
    margin-top: 0.45rem;
    font-size: 0.85rem;
  }
}

.field.full {
  grid-column: 1 / -1;
}
.field.textarea .floating {
  top: 14px;
}

.actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 0.6rem;
}

.feedback {
  min-width: 220px;
}
.success {
  color: #2ecc71;
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
