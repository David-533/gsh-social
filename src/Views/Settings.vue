<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { signOut } from "firebase/auth";
import { useRouter } from "vue-router";
import { auth } from "../firebase";
import { subscribeUserProfile, updateProfileVisibility } from "../services/socialService";
import { useUserStore } from "../stores/userStore";

const router = useRouter();
const userStore = useUserStore();
const profile = ref(null);
const isSaving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
let unsubscribe;

onMounted(() => {
  unsubscribe = subscribeUserProfile(userStore.user.uid, value => {
    profile.value = value;
    if (!value) errorMessage.value = "Profil introuvable.";
  }, error => {
    console.error("Settings profile error", error);
    errorMessage.value = "Impossible de charger les paramètres. Vérifie ta connexion et les règles Firestore.";
  });
});

onUnmounted(() => unsubscribe?.());

async function changeVisibility(event) {
  const nextPublic = !event.target.checked;
  isSaving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    await updateProfileVisibility(userStore.user.uid, nextPublic);
    profile.value = { ...profile.value, profilePublic: nextPublic };
    successMessage.value = "Confidentialité enregistrée.";
  } catch (error) {
    console.error("Settings visibility error", error);
    event.target.checked = profile.value?.profilePublic === false;
    errorMessage.value = "Impossible d’enregistrer ce réglage. Vérifie ta connexion et les règles Firestore.";
  } finally {
    isSaving.value = false;
  }
}

async function logout() {
  errorMessage.value = "";
  try {
    await signOut(auth);
    userStore.logout();
    await router.push("/login");
  } catch (error) {
    console.error("Sign out error", error);
    errorMessage.value = "Impossible de te déconnecter. Réessaie.";
  }
}
</script>

<template>
  <main class="settings-page">
    <header class="settings-header">
      <p class="eyebrow">TON COMPTE</p>
      <h1>Paramètres</h1>
    </header>

    <p v-if="errorMessage" class="notice notice-error" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="notice notice-success" role="status">{{ successMessage }}</p>

    <section class="settings-section" aria-labelledby="privacy-heading">
      <div class="section-heading"><h2 id="privacy-heading">Confidentialité</h2></div>
      <div class="setting-row">
        <div class="setting-copy">
          <strong>Profil privé</strong>
          <p>Si activé, seuls tes abonnés peuvent voir les photos et vidéos de ton profil.</p>
          <p>Les publications du fil restent visibles par tous les membres connectés.</p>
          <p>Les abonnements sont acceptés automatiquement.</p>
        </div>
        <label class="switch" :class="{ 'switch-disabled': !profile || isSaving }">
          <input type="checkbox" :checked="profile?.profilePublic === false" :disabled="!profile || isSaving" role="switch" aria-label="Profil privé" @change="changeVisibility" />
          <span aria-hidden="true"></span>
        </label>
      </div>
    </section>

    <section class="settings-section" aria-labelledby="account-heading">
      <div class="section-heading"><h2 id="account-heading">Compte</h2></div>
      <div class="setting-row">
        <div class="setting-copy"><strong>Informations du profil</strong><p>Photo, pseudo et bio</p></div>
        <RouterLink class="action-link" to="/modifier-profil">Modifier</RouterLink>
      </div>
      <div class="setting-row">
        <div class="setting-copy"><strong>Adresse e-mail</strong><p>{{ userStore.user?.email || "Non renseignée" }}</p></div>
      </div>
      <div class="setting-row">
        <div class="setting-copy"><strong>Session</strong></div>
        <button class="logout-action" type="button" @click="logout">Se déconnecter</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.settings-page { width: min(100%, 760px); margin: 0 auto; color: #23332d; }
.settings-header { margin-bottom: 30px; }
.eyebrow { margin: 0 0 7px; color: #66836f; font-size: 10px; font-weight: 700; }
.settings-header h1 { margin: 0; color: #19382f; font: 600 30px/1.15 'Space Grotesk', sans-serif; }
.settings-section { margin-top: 30px; }
.section-heading { padding-bottom: 12px; border-bottom: 1px solid #dfe6de; }
.section-heading h2 { margin: 0; color: #263c31; font: 600 16px 'Space Grotesk', sans-serif; }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px 0; border-bottom: 1px solid #e6ebe5; }
.setting-copy { min-width: 0; }
.setting-copy strong { color: #263c31; font-size: 13px; }
.setting-copy p { max-width: 540px; margin: 5px 0 0; color: #718078; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.action-link, .logout-action { flex: 0 0 auto; padding: 9px 12px; border: 1px solid #dfe6dc; border-radius: 4px; background: #fff; color: #405c47; font: 600 11px 'DM Sans', sans-serif; text-decoration: none; cursor: pointer; }
.logout-action { color: #a64e43; }
.switch { position: relative; display: inline-flex; width: 44px; height: 26px; flex: 0 0 44px; cursor: pointer; }
.switch input { position: absolute; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: inherit; }
.switch span { width: 100%; border-radius: 20px; background: #b6c1b8; transition: background .15s ease; }
.switch span::after { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; content: ''; transition: transform .15s ease; }
.switch input:checked + span { background: #3d7652; }
.switch input:checked + span::after { transform: translateX(18px); }
.switch input:focus-visible + span { outline: 3px solid #8eaf91; outline-offset: 3px; }
.switch-disabled { opacity: .55; cursor: wait; }
.notice { margin: 0; padding: 12px; border-radius: 4px; font-size: 12px; line-height: 1.5; }
.notice-error { color: #9c4037; background: #fff1ed; }
.notice-success { color: #315d49; background: #edf4e5; }
@media (max-width: 760px) {
  .settings-header h1 { font-size: 25px; }
  .settings-section { margin-top: 24px; }
  .setting-row { gap: 12px; padding: 16px 0; }
}
</style>