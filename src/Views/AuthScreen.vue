<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createUserWithEmailAndPassword, deleteUser, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from "firebase/auth";
import { DEFAULT_PROFILE_PHOTO, useUserStore } from "../stores/userStore";
import { auth } from "../firebase";
import { ensureUserProfile } from "../services/socialService";

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: value => ["login", "register"].includes(value),
  },
});

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const isRegister = computed(() => props.mode === "register");
const registrationComplete = computed(() => !isRegister.value && route.query.registered === "1");
const pageTitle = computed(() => isRegister.value ? "Rejoins la conversation." : "Retrouve ta communauté.");
const pageDescription = computed(() => isRegister.value
  ? "Crée ton espace et partage ce qui compte pour toi."
  : "Les idées, les visages et les nouvelles de ton cercle, au même endroit.");

const pseudo = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const error = ref("");
const loading = ref(false);
const passwordScore = computed(() => {
  if (!password.value) return 0;
  return [
    password.value.length >= 8,
    /[A-Z]/.test(password.value) && /[a-z]/.test(password.value),
    /\d/.test(password.value),
    /[^A-Za-z0-9]/.test(password.value),
  ].filter(Boolean).length;
});

const finishLogin = async () => {
  await router.push("/home");
};

const handleSubmit = async () => {
  if (loading.value) return;
  error.value = "";

  if (isRegister.value) {
    const normalizedPseudo = pseudo.value.trim();
    const normalizedEmail = email.value.trim().toLowerCase();

    if (!normalizedPseudo || !normalizedEmail || !password.value || !confirmPassword.value) {
      error.value = "Tous les champs sont obligatoires.";
      return;
    }
    if (normalizedPseudo.length < 3) {
      error.value = "Le pseudo doit contenir au moins 3 caractères.";
      return;
    }
    if (password.value.length < 8) {
      error.value = "Choisis un mot de passe d’au moins 8 caractères.";
      return;
    }
    if (password.value !== confirmPassword.value) {
      error.value = "Les deux mots de passe ne correspondent pas.";
      return;
    }
    loading.value = true;
      let credential;
      try {
        credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password.value);
        await updateProfile(credential.user, { displayName: normalizedPseudo });
        const profile = await ensureUserProfile(credential.user, normalizedPseudo);
        userStore.setSession({ ...profile, provider: "password" });
        await signOut(auth);
        userStore.logout();
      } catch (registrationError) {
        if (credential?.user) await deleteUser(credential.user).catch(() => {});
        loading.value = false;
        error.value = registrationError.code === "auth/email-already-in-use"
          ? "Un compte existe déjà avec cette adresse e-mail."
          : registrationError.code === "auth/operation-not-allowed"
            ? "Active la méthode E-mail/Mot de passe dans Firebase Authentication."
            : registrationError.message?.includes("pseudo")
              ? registrationError.message
              : "Impossible de créer le compte. Vérifie Firebase et réessaie.";
        return;
      }
      await router.replace({ path: "/login", query: { registered: "1" } });
      return;
  } else {
    if (!email.value.trim() || !password.value) {
      error.value = "Saisis ton adresse e-mail et ton mot de passe.";
      return;
    }
    loading.value = true;
    try {
      const legacyAccount = userStore.findLegacyAccount(email.value.trim(), password.value);
      const loginEmail = email.value.trim().includes("@") ? email.value.trim().toLowerCase() : legacyAccount?.email;
      if (!loginEmail) throw new Error("Identifiants incorrects.");
      let credential;
      try {
        credential = await signInWithEmailAndPassword(auth, loginEmail, password.value);
      } catch (firebaseLoginError) {
        if (firebaseLoginError.code !== "auth/user-not-found" || !legacyAccount) throw firebaseLoginError;
        credential = await createUserWithEmailAndPassword(auth, loginEmail, password.value);
        await updateProfile(credential.user, { displayName: legacyAccount.pseudo });
        userStore.removeLegacyAccount(loginEmail);
      }
      const profile = await ensureUserProfile(credential.user);
      userStore.setSession({ ...profile, provider: credential.user.providerData.some(provider => provider.providerId === "password") ? "password" : "google" });
    } catch (loginError) {
      loading.value = false;
      error.value = loginError.code === "auth/operation-not-allowed"
        ? "Active la méthode E-mail/Mot de passe dans Firebase Authentication."
        : "Identifiants incorrects. Vérifie tes informations ou crée un compte.";
      return;
    }
  }

  await finishLogin();
};

const connectWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    const profile = await ensureUserProfile(result.user);
    userStore.setSession({ ...profile, provider: "google" });
    await finishLogin();
  } catch {}
};
</script>

<template>
  <main class="auth-page" :class="{ 'auth-page--register': isRegister }">
    <section class="auth-visual" aria-label="SIO Social">
      <div class="brand" aria-label="SIO Social">
        <span class="brand-mark">S</span>
        <span>SIO<span class="brand-light">/</span>SOCIAL</span>
      </div>

      <div class="social-markers" aria-hidden="true">
        <span class="social-marker social-marker--instagram">
          <span class="social-icon social-icon--instagram"><i></i></span>
          <span>Instagram</span>
        </span>
        <span class="social-marker social-marker--facebook">
          <span class="social-icon social-icon--facebook">f</span>
          <span>Facebook</span>
        </span>
        <span class="social-marker social-marker--chat">
          <span class="social-icon social-icon--chat"><i></i></span>
          <span>Discussions</span>
        </span>
      </div>

      <div class="visual-copy">
        <span class="visual-kicker">TON CERCLE, TON ESPACE</span>
        <h1>{{ pageTitle }}</h1>
        <p>{{ pageDescription }}</p>
      </div>

      <div class="visual-footer">
        <div class="avatar-stack" aria-hidden="true">
          <span class="avatar avatar--one">L</span>
          <span class="avatar avatar--two">M</span>
          <span class="avatar avatar--three">A</span>
        </div>
        <p>Les échanges commencent ici.</p>
        <span class="visual-index">01 — 03</span>
      </div>
    </section>

    <section class="auth-main">
      <div class="mobile-brand">SIO<span>/</span>SOCIAL</div>
      <div class="auth-content">
        <header class="form-heading">
          <p class="eyebrow">{{ isRegister ? "BIENVENUE DANS LE CERCLE" : "HEUREUX DE TE REVOIR" }}</p>
          <h2>{{ isRegister ? "Créer un compte" : "Connexion" }}</h2>
          <p class="form-subtitle">
            {{ isRegister ? "Quelques détails et tu peux commencer." : "Connecte-toi pour retrouver ton fil." }}
          </p>
        </header>

        <p v-if="registrationComplete" class="form-message form-message--success" role="status">
          Compte créé. Tu peux maintenant te connecter.
        </p>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <div v-if="isRegister" class="field-group">
            <label for="pseudo">Pseudo</label>
            <input
              id="pseudo"
              v-model="pseudo"
              type="text"
              name="nickname"
              placeholder="Ex. alex martin"
              autocomplete="nickname"
              minlength="3"
              maxlength="32"
              required
            />
          </div>

          <div class="field-group">
            <label for="email">Adresse e-mail</label>
            <input
              id="email"
              v-model="email"
              type="email"
              name="email"
              placeholder="toi@exemple.fr"
              autocomplete="email"
              required
            />
          </div>

          <div class="field-group">
            <div class="label-row">
              <label for="password">Mot de passe</label>
              <span v-if="isRegister" class="field-hint">8 caractères minimum</span>
            </div>
            <div class="password-wrap">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
                :minlength="isRegister ? 8 : undefined"
                required
              />
              <button
                class="reveal-button"
                type="button"
                :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? "Masquer" : "Afficher" }}
              </button>
            </div>
            <div v-if="isRegister" class="strength-meter" :aria-label="`Robustesse : ${passwordScore} sur 4`">
              <span v-for="part in 4" :key="part" :class="{ active: part <= passwordScore }"></span>
            </div>
          </div>

          <div v-if="isRegister" class="field-group">
            <label for="confirm-password">Confirmer le mot de passe</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              name="confirm-password"
              autocomplete="new-password"
              required
            />
          </div>

          <p v-if="error" class="form-message form-message--error" role="alert">{{ error }}</p>
          <button class="submit-button" type="submit" :disabled="loading">
            <span>{{ loading ? "Connexion en cours…" : (isRegister ? "Créer mon compte" : "Se connecter") }}</span>
            <span aria-hidden="true">↗</span>
          </button>
        </form>

        <div class="separator"><span>ou continuer avec</span></div>
        <button
          class="google-button"
          type="button"
          @click="connectWithGoogle"
        >
          <span class="google-mark" aria-hidden="true">G</span>
          <span>Continuer avec Google</span>
        </button>

        <p class="switch-mode">
          {{ isRegister ? "Tu as déjà un compte ?" : "Pas encore de compte ?" }}
          <RouterLink :to="isRegister ? '/login' : '/inscription'">
            {{ isRegister ? "Se connecter" : "Créer un compte" }}
          </RouterLink>
        </p>
        <p class="legal-note">En continuant, tu acceptes de garder les échanges respectueux.</p>
      </div>
    </section>
  </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

:root {
  font-family: 'DM Sans', sans-serif;
  color: #17241f;
  background: #edf1ec;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; min-height: 100vh; }
button, input { font: inherit; }
button, a { -webkit-tap-highlight-color: transparent; }

.auth-page {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(460px, 1.05fr);
  min-height: 100svh;
  padding: 16px;
  gap: 22px;
  background-color: #edf1ec;
  background-image: linear-gradient(rgba(18, 58, 48, .035) 1px, transparent 1px), linear-gradient(90deg, rgba(18, 58, 48, .035) 1px, transparent 1px);
  background-size: 32px 32px;
}

.auth-visual {
  position: relative;
  isolation: isolate;
  display: flex;
  min-height: 0;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  padding: 28px 32px;
  color: #f7f7ef;
  background-color: #143b31;
  background-image: linear-gradient(180deg, rgba(12, 40, 33, .22) 0%, rgba(12, 40, 33, .05) 42%, rgba(12, 40, 33, .91) 100%), url('https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1400&q=85');
  background-size: cover;
  background-position: 38% center;
  animation: panel-arrive .7s ease-out both;
}

.auth-visual::after {
  position: absolute;
  z-index: -1;
  inset: 0;
  border: 1px solid rgba(255,255,255,.18);
  content: '';
  pointer-events: none;
}

.brand, .mobile-brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  width: fit-content;
  color: inherit;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 35px;
  height: 35px;
  place-items: center;
  color: #173c31;
  background: #c9ef74;
  font-size: 20px;
}

.social-markers { position: absolute; inset: 0; pointer-events: none; }
.social-marker { position: absolute; display: flex; align-items: center; gap: 9px; padding: 9px 13px 9px 9px; border: 1px solid rgba(255,255,255,.55); border-radius: 6px; color: #23332d; background: rgba(255,255,255,.94); box-shadow: 0 10px 32px rgba(8,28,22,.2); font-size: 11px; font-weight: 700; animation: marker-float 5s ease-in-out infinite; }
.social-marker--instagram { top: 24%; right: 8%; }
.social-marker--facebook { top: 16%; left: 7%; animation-delay: -1.7s; }
.social-marker--chat { right: 7%; bottom: 23%; animation-delay: -3.2s; }
.social-icon { position: relative; display: grid; width: 29px; height: 29px; flex: 0 0 29px; place-items: center; border-radius: 7px; color: #fff; }
.social-icon--instagram { background: linear-gradient(145deg, #f8b13f, #e74475 55%, #8045b5); }
.social-icon--instagram::before { width: 15px; height: 15px; border: 2px solid currentColor; border-radius: 5px; content: ''; }
.social-icon--instagram::after { position: absolute; top: 7px; right: 7px; width: 3px; height: 3px; border-radius: 50%; background: currentColor; content: ''; }
.social-icon--instagram i { position: absolute; width: 7px; height: 7px; border: 2px solid currentColor; border-radius: 50%; }
.social-icon--facebook { background: #1877f2; font: 700 25px/1 Arial, sans-serif; padding-top: 5px; }
.social-icon--chat { background: #276b56; }
.social-icon--chat::before { width: 16px; height: 12px; border-radius: 5px; background: #fff; content: ''; }
.social-icon--chat::after { position: absolute; bottom: 6px; left: 7px; width: 0; height: 0; border-top: 5px solid #fff; border-right: 5px solid transparent; content: ''; }
.social-icon--chat i, .social-icon--chat i::before, .social-icon--chat i::after { position: absolute; z-index: 1; width: 2px; height: 2px; border-radius: 50%; background: #276b56; }
.social-icon--chat i { left: 11px; top: 13px; }
.social-icon--chat i::before, .social-icon--chat i::after { top: 0; content: ''; }
.social-icon--chat i::before { left: -4px; }
.social-icon--chat i::after { left: 4px; }

.brand-light { color: #c9ef74; }
.visual-copy { max-width: 490px; margin: auto 0; padding: 46px 0 58px; }
.visual-kicker, .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; }
.visual-kicker { color: #d3ef9a; }
.visual-copy h1 { max-width: 470px; margin: 20px 0 18px; font: 600 58px/1.03 'Space Grotesk', sans-serif; letter-spacing: 0; }
.visual-copy p { max-width: 360px; margin: 0; color: rgba(247,247,239,.8); font-size: 16px; line-height: 1.7; }
.visual-footer { display: flex; align-items: center; gap: 14px; color: rgba(247,247,239,.82); font-size: 13px; }
.visual-footer p { margin: 0; }
.visual-index { margin-left: auto; color: #c9ef74; font: 600 12px 'Space Grotesk', sans-serif; }
.avatar-stack { display: flex; padding-left: 4px; }
.avatar { display: grid; width: 30px; height: 30px; margin-left: -4px; place-items: center; border: 2px solid #183d33; border-radius: 50%; color: #24352e; font-size: 10px; font-weight: 700; }
.avatar--one { background: #ffc2a8; }
.avatar--two { background: #e6d3ff; }
.avatar--three { background: #c9ef74; }

.auth-main { display: grid; min-height: 0; place-items: center; padding: 26px clamp(28px, 6vw, 100px); }
.auth-content { width: min(100%, 410px); animation: content-arrive .65s .08s ease-out both; }
.form-heading { margin-bottom: 24px; }
.eyebrow { margin: 0 0 12px; color: #588071; }
.form-heading h2 { margin: 0; color: #17241f; font: 600 38px/1.15 'Space Grotesk', sans-serif; letter-spacing: 0; }
.form-subtitle { margin: 10px 0 0; color: #68756e; font-size: 14px; line-height: 1.6; }
.auth-form { display: grid; gap: 15px; }
.field-group { display: grid; gap: 8px; }
.field-group label { color: #263a31; font-size: 13px; font-weight: 700; }
.label-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.field-hint { color: #87918a; font-size: 11px; }
.field-group input {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border: 1px solid #d5ddd5;
  border-radius: 5px;
  outline: none;
  color: #17241f;
  background: rgba(255,255,255,.68);
  transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
}
.field-group input::placeholder { color: #a0aaa2; }
.field-group input:focus { border-color: #4b826d; background: #fff; box-shadow: 0 0 0 3px rgba(75,130,109,.13); }
.password-wrap { position: relative; }
.password-wrap input { padding-right: 88px; }
.reveal-button { position: absolute; top: 50%; right: 12px; padding: 5px; transform: translateY(-50%); border: 0; color: #4b7564; background: none; font-size: 11px; font-weight: 700; cursor: pointer; }
.strength-meter { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
.strength-meter span { height: 3px; background: #dbe1db; transition: background .2s ease; }
.strength-meter span.active { background: #b4d85f; }
.submit-button { display: flex; height: 50px; align-items: center; justify-content: space-between; margin-top: 3px; padding: 0 16px; border: 0; border-radius: 5px; color: #f7f7ef; background: #183f33; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .18s ease, transform .18s ease; }
.submit-button span:last-child { color: #c9ef74; font-size: 19px; }
.submit-button:hover:not(:disabled) { transform: translateY(-1px); background: #245846; }
.submit-button:disabled { opacity: .65; cursor: wait; }
.form-message { margin: 0; font-size: 12px; line-height: 1.5; }
.form-message--error { color: #b94335; }
.form-message--success { margin: -8px 0 18px; color: #276b56; }
.separator { display: flex; align-items: center; gap: 14px; margin: 18px 0 13px; color: #89938c; font-size: 11px; }
.separator::before, .separator::after { height: 1px; flex: 1; background: #d9e0d9; content: ''; }
.google-button {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 11px;
  border: 1px solid #d5ddd5;
  border-radius: 5px;
  color: #263a31;
  background: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s ease, border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}
.google-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #a7b9ac;
  background: #f1f5f2;
  box-shadow: 0 0 0 3px rgba(54, 91, 67, .08), 0 5px 15px rgba(30, 55, 39, .08);
}
.google-button:focus-visible { outline: 3px solid rgba(54, 91, 67, .4); outline-offset: 3px; }
.google-button:disabled { opacity: .7; cursor: wait; }
.google-mark {
  background: conic-gradient(from -45deg, #4285f4 0 25%, #34a853 25% 50%, #fbbc05 50% 75%, #ea4335 75%);
  background-clip: text;
  color: transparent;
  font: 700 22px/1 Arial, sans-serif;
  -webkit-background-clip: text;
}
.switch-mode { margin: 20px 0 0; color: #68756e; text-align: center; font-size: 12px; }
.switch-mode a { margin-left: 4px; color: #285d49; font-weight: 700; text-decoration: none; }
.switch-mode a:hover { text-decoration: underline; }
.legal-note { margin: 24px 0 0; color: #9aa39c; text-align: center; font-size: 10px; }
.mobile-brand { display: none; }

@keyframes panel-arrive { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
@keyframes content-arrive { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
@keyframes marker-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

@media (max-width: 900px) {
  .auth-page { grid-template-columns: minmax(0, .85fr) minmax(400px, 1.15fr); gap: 12px; padding: 12px; }
  .auth-visual { padding: 24px; }
  .visual-copy { max-width: 100%; }
  .visual-copy h1 { max-width: 100%; font-size: 36px; }
  .auth-main { padding: 20px 28px; }
}

@media (max-width: 700px) {
  .auth-page { display: block; min-height: 100svh; padding: 0; background: #edf1ec; }
  .auth-visual { display: none; }
  .auth-main { display: block; min-height: 100svh; padding: 20px 22px 24px; }
  .mobile-brand { display: inline-flex; margin-bottom: 28px; color: #183f33; font-size: 14px; }
  .mobile-brand span { color: #ed7457; }
  .auth-content { margin: 0 auto; }
  .form-heading { margin-bottom: 20px; }
  .form-heading h2 { font-size: 34px; }
  .auth-form { gap: 13px; }
  .field-group input { height: 44px; }
  .separator { margin: 15px 0 11px; }
  .switch-mode { margin-top: 17px; }
  .legal-note { margin-top: 19px; }
}

@media (max-width: 1050px) and (min-width: 701px) {
  .social-marker { padding: 7px; }
  .social-marker > span:last-child { display: none; }
}

@media (max-height: 740px) and (min-width: 701px) {
  .auth-page { padding: 10px; }
  .auth-visual { padding-block: 20px; }
  .visual-copy { padding: 28px 0; }
  .visual-copy h1 { margin: 14px 0; font-size: 46px; }
  .auth-main { padding-block: 12px; }
  .form-heading { margin-bottom: 17px; }
  .form-heading h2 { font-size: 34px; }
  .form-subtitle { margin-top: 6px; }
  .auth-form { gap: 11px; }
  .field-group input { height: 42px; }
  .separator { margin: 13px 0 9px; }
  .switch-mode { margin-top: 14px; }
  .legal-note { margin-top: 15px; }
}

@media (max-height: 740px) and (max-width: 700px) {
  .auth-main { padding: 10px 16px 12px; }
  .mobile-brand { margin-bottom: 10px; }
  .form-heading { margin-bottom: 10px; }
  .form-heading h2 { font-size: 28px; }
  .form-subtitle { margin-top: 4px; }
  .auth-form { gap: 7px; }
  .field-group, .field-group label { gap: 4px; }
  .field-group input { height: 36px; }
  .submit-button { height: 40px; }
  .separator { margin: 8px 0 6px; }
  .google-button { min-height: 36px; }
  .switch-mode { margin-top: 8px; }
  .legal-note { margin-top: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
</style>