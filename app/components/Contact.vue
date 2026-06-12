<template>
  <section class="contact" aria-labelledby="contact-title">
    <div class="contactLayout">
      <div class="formLayout">
        <div class="header">
          <h2 id="contact-title">Me contacter</h2>
          <p>
            Vous avez une question, une proposition de projet ou vous voulez
            simplement dire bonjour ? N'hésitez pas à m'envoyer un message en
            remplissant le formulaire ci-contre.
            <b>Je vous répondrai dès que possible !</b>
          </p>
        </div>
        <form
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          name="contact"
          @submit.prevent="onSubmit"
          class="contactForm"
        >
          <!-- :class="{
            'contactForm--hidden': sent || isSending,
          }" -->
          <!-- honeypot -->
          <p class="sr-only">
            <label
              >Remplissez ceci uniquement si vous êtes un robot
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
                :class="{ active: form.name, 'has-error': errors.name }"
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
                :class="{ active: form.email, 'has-error': errors.email }"
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
                :class="{ active: form.message, 'has-error': errors.message }"
              ></textarea>
              <span class="floating">Message</span>
              <span class="error" v-if="errors.message">{{
                errors.message
              }}</span>
            </label>
          </div>

          <div class="actions">
            <button
              v-if="!hasValidationErrors && isFilled"
              type="submit"
              class="a mail"
              :disabled="isSending"
            >
              <span v-if="!isSending">Envoyer</span>
              <span v-else>Envoi…</span>
            </button>

            <div class="feedback">
              <p class="success" v-if="sent">Merci — message envoyé !</p>
              <p class="error" v-if="submitError">{{ submitError }}</p>
            </div>
          </div>
        </form>
      </div>
      <aside aria-hidden="true">
        <Main :state="handState" />
      </aside>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";

interface FormModel {
  name: string;
  email: string;
  message: string;
}

const form = reactive<FormModel>({
  name: "",
  email: "",
  message: "",
});

const botField = ref("");
const errors = reactive<Record<string, string>>({});
const isSending = ref(false);
const sent = ref(false);
const submitError = ref("");
const validationTimers = new Map<
  keyof Pick<FormModel, "name" | "email" | "message">,
  number
>();

const hasTypedContent = computed(() =>
  [form.name, form.email, form.message].some(
    (value) => value.trim().length > 0,
  ),
);

const isFilled = computed(() =>
  [form.name, form.email, form.message].every(
    (value) => value.trim().length !== 0,
  ),
);

const hasValidationErrors = computed(
  () =>
    hasTypedContent.value &&
    Boolean(errors.name || errors.email || errors.message),
);

const containsInsults = computed(() => {
  const insults = ["connard", "idiot", "stupide", "imbécile"];
  const content = `${form.name} ${form.email} ${form.message}`.toLowerCase();
  return insults.some((insult) => content.includes(insult));
});

const handState = computed(() => {
  if (isSending.value) return "sending";
  if (sent.value) return "success";
  if (submitError.value) return "error";
  if (containsInsults.value) return "insult";
  if (hasValidationErrors.value) return "warning";
  if (hasTypedContent.value) return "active";
  return "idle";
});

function isEmptyField(value: string) {
  return value.trim().length === 0;
}

function validateName(name: string) {
  return name.trim() ? "" : "Le nom est requis.";
}

function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? "" : "Email invalide.";
}

function validateMessage(message: string) {
  return message.trim().length < 10
    ? "Message trop court (≥10 caractères)."
    : "";
}

function validateField(field: keyof FormModel) {
  if (containsInsults.value) {
    errors.message = "Non mais !";
    return;
  }

  if (field === "name") {
    errors.name = !isEmptyField(form.name) ? validateName(form.name) : "";
    return;
  }

  if (field === "email") {
    errors.email = !isEmptyField(form.email) ? validateEmail(form.email) : "";
    return;
  }

  if (field === "message") {
    errors.message = !isEmptyField(form.message)
      ? validateMessage(form.message)
      : "";
    return;
  }
}

function validateFields(fields: Array<keyof FormModel>) {
  fields.forEach((field) => validateField(field));
}

function validate() {
  validateFields(["name", "email", "message"]);
  return !Object.values(errors).some(Boolean);
}

function scheduleValidation(field: "name" | "email" | "message") {
  const existingTimer = validationTimers.get(field);

  if (existingTimer !== undefined) {
    window.clearTimeout(existingTimer);
  }

  validationTimers.set(
    field,
    window.setTimeout(() => {
      validateField(field);
      validationTimers.delete(field);
    }, 1),
  );
}

watch(
  () => form.name,
  () => scheduleValidation("name"),
);
watch(
  () => form.email,
  () => scheduleValidation("email"),
);
watch(
  () => form.message,
  () => scheduleValidation("message"),
);

onBeforeUnmount(() => {
  for (const timer of validationTimers.values()) {
    window.clearTimeout(timer);
  }

  validationTimers.clear();
});

async function onSubmit() {
  submitError.value = "";
  sent.value = false;

  if (botField.value) return;

  if (!validate()) return;
  isSending.value = true;

  // On utilise URLSearchParams pour simuler un envoi de formulaire classique
  const body = new URLSearchParams();
  body.append("form-name", "contact");
  body.append("name", form.name);
  body.append("email", form.email);
  body.append("message", form.message);

  try {
    const response = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) throw new Error();

    sent.value = true;
    form.name = "";
    form.email = "";
    form.message = "";
  } catch (e) {
    submitError.value = "Erreur lors de l'envoi. Veuillez réessayer.";
  } finally {
    isSending.value = false;
  }
}
</script>

<style lang="scss" scoped>
.contact {
  margin: 2rem 10vw;
  padding: 1.6rem;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.02),
    rgba(255, 255, 255, 0.01)
  );
}

.contactLayout {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
}

.formLayout {
  flex-basis: 710px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.9rem;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
}

.field {
  position: relative;
  display: flex;
  flex-direction: column;

  &.full {
    grid-column: 1 / -1;
  }

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
    bottom: calc(100% - 16px);
    transform: translateY(100%);
    pointer-events: none;
    color: #9aa4b2;
    background: var(--section-color);
    padding-inline: 4px;
    height: fit-content;
    font-size: 0.88rem;
    transform-origin: left top;
    $duration: 0.18s;
    $type: ease;
    transition:
      transform $duration $type,
      bottom $duration $type,
      font-size $duration $type,
      color $duration $type;
  }

  /* underline focus */
  input,
  textarea {
    &:focus {
      box-shadow: 0 6px 18px rgba(80, 110, 255, 0.06);
      border-color: rgba(100, 140, 255, 0.9);
    }

    &:focus,
    &.active {
      & + .floating {
        color: rgba(80, 110, 255, 0.9);
        bottom: 100%;
        transform: translateY(50%);
      }

      &.has-error + .floating {
        color: #ff6b6b;
      }
    }
  }

  .error {
    color: #ff6b6b;
    margin-top: 0.45rem;
    font-size: 0.85rem;
  }
}

.actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 0.6rem;
}

.success {
  color: #2ecc71;
}

aside {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-inline: 70px;
}

.contactForm--hidden {
  opacity: 0;
  pointer-events: none;
}
</style>
