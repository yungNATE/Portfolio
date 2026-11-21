<template>
  <div class="contact" aria-labelledby="contact-title">
    <div class="contact__intro">
      <SectionHeading
        id="contact-title"
        eyebrow="Un projet, une idée, un café ?"
      >
        Me contacter
      </SectionHeading>

      <p class="contact__lead">
        Vous avez une question, une proposition de projet ou vous voulez
        simplement dire bonjour ? N'hésitez pas à m'envoyer un message en
        remplissant le formulaire ci-contre.
        <b>Je vous répondrai dès que possible !</b>
      </p>

      <!-- Alternatives au formulaire -->
      <dl class="contact__channels">
        <div>
          <dt>Réseau</dt>
          <dd>
            <a
              href="https://www.linkedin.com/in/martinigol/"
              class="external"
              target="_blank"
              >LinkedIn</a
            >
          </dd>
        </div>
        <div>
          <dt>CV</dt>
          <dd>
            <a href="/Frontend_CV_MartinigolNathan.pdf" class="external"
              >Version PDF</a
            >
          </dd>
        </div>
        <div>
          <dt>Disponibilité</dt>
          <dd>Freelance ou CDI</dd>
        </div>
      </dl>
    </div>

    <div class="contactLayout" ref="contactLayoutRef">
      <div class="formWrapper">
        <div class="formLayout" ref="formRef">
          <form
            data-netlify="true"
            data-netlify-honeypot="bot-field"
            name="contact"
            method="POST"
            @submit.prevent="onSubmit"
            class="contactForm"
          >
            <!-- :class="{
            'contactForm--hidden': sent || isSending,
          }" -->
            <input type="hidden" name="form-name" value="contact" />
            <!-- honeypot -->
            <p class="sr-only">
              <label
                >Remplissez ceci uniquement si vous êtes un robot
                <input name="bot-field" v-model="botField" autocomplete="off"
              /></label>
            </p>

            <div class="grid">
              <label class="field">
                <span class="control">
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
                  <fieldset class="outline" aria-hidden="true">
                    <legend><span>Nom</span></legend>
                  </fieldset>
                </span>
                <span class="error" v-if="errors.name">{{ errors.name }}</span>
              </label>

              <label class="field">
                <span class="control">
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
                  <fieldset class="outline" aria-hidden="true">
                    <legend><span>Email</span></legend>
                  </fieldset>
                </span>
                <span class="error" v-if="errors.email">{{
                  errors.email
                }}</span>
              </label>

              <label class="field full textarea">
                <span class="control">
                  <textarea
                    name="message"
                    v-model="form.message"
                    rows="5"
                    required
                    :aria-invalid="!!errors.message"
                    :class="{
                      active: form.message,
                      'has-error': errors.message,
                    }"
                  ></textarea>
                  <span class="floating">Message</span>
                  <fieldset class="outline" aria-hidden="true">
                    <legend><span>Message</span></legend>
                  </fieldset>
                </span>
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
      </div>
      <aside class="handWrapper" ref="handWrapperRef" aria-hidden="true">
        <Main
          :state="handState"
          :formRef="formRef"
          :handWrapperRef="handWrapperRef"
          :contactLayoutRef="contactLayoutRef"
        />
      </aside>
    </div>
  </div>
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

const year = new Date().getFullYear();
const botField = ref("");
const errors = reactive<Record<string, string>>({});
const isSending = ref(false);
const sent = ref(false);
const submitError = ref("");
const formRef = ref<HTMLElement | null>(null);
const handWrapperRef = ref<HTMLElement | null>(null);
const contactLayoutRef = ref<HTMLElement | null>(null);

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
  // return;
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

  // TODO : validateField en direct, mais réaction délayée
  validationTimers.set(
    field,
    window.setTimeout(() => {
      validateField(field);
      validationTimers.delete(field);
    }, 1000),
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
// Même cadre que Parcours : colonne d'intro (titre, texte, alternatives) en
// haut à gauche ; à droite, formulaire compact et main côte à côte, centrés
// dans l'espace restant.
.contact {
  --intro-width: clamp(280px, 30vw, 460px);
  --form-width: 26rem;

  display: grid;
  grid-template-columns: var(--intro-width) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  column-gap: clamp(2rem, 5vw, 4rem);
  row-gap: 1.5rem;
}

.contact__intro {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.contact__lead {
  margin: 0;
  font-family: var(--font-text);
  font-size: 1.05rem;
  line-height: 1.6;
}

.contact__channels {
  display: grid;
  gap: 1rem;
  margin: 0;

  dt {
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.65;
  }

  dd {
    margin: 0.2rem 0 0;
    font-weight: 600;
  }
}

.contact__footer {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem 2rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.15);
  font-size: 0.85rem;

  p {
    margin: 0;
  }
}

.contactLayout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  min-height: 0;
}

// Formulaire compact en largeur comme en hauteur. `flex-basis: auto` (et non
// une largeur) pour rester valable quand la disposition passe en colonne.
.formWrapper {
  overflow-x: hidden;
  flex: 0 1 auto;
  width: 100%;
  max-width: var(--form-width);
}

.formLayout {
  display: flex;
  flex-direction: column;
  // Dans .formWrapper, qui rogne ce qui dépasse : place pour l'étiquette
  // remontée et le contour des champs du haut, et pour l'ombre du champ
  // actif en bas.
  padding: 12px 5px 24px;
}

.contactForm {
  display: flex;
  flex-direction: column;
}

.grid {
  display: grid;
  // minmax(0, …) : sinon une colonne ne descend pas sous la largeur native
  // d'un <input> et déborde, bordure droite rognée par .formWrapper.
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.field {
  position: relative;
  display: flex;
  flex-direction: column;

  &.full {
    grid-column: 1 / -1;
  }

  // Champ + étiquette + contour : référence de positionnement de l'étiquette,
  // sans le message d'erreur placé dessous.
  .control {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  input[type="text"],
  input[type="email"],
  input[type="url"],
  textarea {
    appearance: none;
    width: 100%;
    min-width: 0;
    padding: 0.9rem 0.75rem;
    // La bordure est dessinée par .outline
    border: none;
    outline: none;
    background: rgba(255, 255, 255, 0.02);
    color: inherit;
    font-family: var(--font-text);
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
    padding-inline: 4px;
    z-index: 1;
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

  /* Contour à encoche : la legend (invisible, au texte de l'étiquette)
     interrompt nativement la bordure du fieldset sous l'étiquette remontée,
     sans fond à faire correspondre avec celui de la section. */
  .outline {
    position: absolute;
    inset: -6px 0 0;
    margin: 0;
    padding: 0 0 0 14px;
    border: 1px solid rgba(60, 70, 90, 0.25);
    pointer-events: none;
    min-width: 0;
    transition: border-color 0.18s;

    legend {
      height: 12px;
      padding: 0;
      font-size: 0.88rem;
      white-space: nowrap;
      overflow: hidden;
      visibility: hidden;
      max-width: 0.01px; // fermée : pas d'encoche
      transition: max-width 0.05s;

      span {
        padding-inline: 4px;
      }
    }
  }

  input,
  textarea {
    &:focus {
      box-shadow: 0 6px 18px rgba(80, 110, 255, 0.06);

      & ~ .outline {
        border-color: rgba(100, 140, 255, 0.9);
      }
    }

    &.has-error ~ .outline {
      border-color: #ff6b6b;
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

      & ~ .outline legend {
        max-width: 100%;
        transition: max-width 0.1s 0.05s;
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

// Toute la hauteur : l'animation d'envoi transforme la main en barre de
// cette hauteur, qui balaie ensuite le formulaire.
.handWrapper {
  align-self: stretch;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-inline: 70px;
}

// Portrait (même critère que le scroll horizontal) : une seule colonne
@media (max-aspect-ratio: 1/1) {
  .contact {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto;
  }

  .contact__intro {
    max-width: 32rem;
  }
}

// Mobile : formulaire et main empilés
@media (max-width: 720px) {
  .contactLayout {
    flex-direction: column;
  }

  .formWrapper {
    flex-basis: auto;
  }

  .handWrapper {
    padding-inline: 0;
  }
}

.contactForm--hidden {
  opacity: 0;
  pointer-events: none;
}
</style>
