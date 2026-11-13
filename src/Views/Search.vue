<template>
  <main class="social-page search-page">
    <header class="page-heading">
      <div>
        <p class="page-eyebrow">FAIS GRANDIR TON CERCLE</p>
        <h1>Recherche</h1>
        <p class="page-description">Trouve les personnes que tu connais et découvre de nouveaux profils.</p>
      </div>
    </header>

    <form class="search-box" role="search" @submit.prevent="runSearch(searchText)">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
      <input ref="searchInput" v-model.trim="searchText" type="search" autocomplete="off" aria-label="Rechercher par pseudo" placeholder="Rechercher un pseudo…" />
      <button v-if="searchText" type="button" class="search-clear" aria-label="Effacer la recherche" @click="clearSearch">Effacer</button>
    </form>

    <section v-if="searchText.length >= 2" class="search-section" aria-live="polite">
      <header class="search-section-heading">
        <div><p class="page-eyebrow">TON RÉSULTAT</p><h2>Profils trouvés</h2></div>
        <span v-if="!isLoading && !searchError" class="result-count">{{ results.length }}</span>
      </header>

      <div v-if="isLoading" class="search-state"><span class="search-spinner" aria-hidden="true"></span><p>Recherche des membres…</p></div>
      <div v-else-if="searchError" class="search-state search-state--error" role="alert"><p>{{ searchError }}</p></div>
      <div v-else-if="!results.length" class="search-state"><span class="search-empty-mark" aria-hidden="true">⌕</span><h3>Aucun profil trouvé</h3><p>Vérifie l’orthographe ou essaie un autre début de pseudo.</p></div>

      <div v-else class="search-member-list">
        <article v-for="member in results" :key="member.id" class="search-member">
          <RouterLink class="search-member-profile" :to="`/profil/${encodeURIComponent(member.id)}`">
            <img :src="member.photo || defaultPhoto" :alt="`Photo de ${member.pseudo}`" />
            <span class="search-member-copy"><strong>{{ member.pseudo }}</strong><small>{{ member.bio || "Membre de la communauté" }}</small></span>
          </RouterLink>
          <RouterLink class="visit-profile" :to="`/profil/${encodeURIComponent(member.id)}`">Voir le profil</RouterLink>
        </article>
      </div>
    </section>

    <section v-else class="search-section suggestions-section">
      <header class="search-section-heading">
        <div><p class="page-eyebrow">À DÉCOUVRIR</p><h2>Suggestions pour toi</h2></div>
        <span v-if="suggestions.length" class="result-count">{{ suggestions.length }}</span>
      </header>

      <div v-if="suggestionsLoading" class="suggestion-grid" aria-label="Chargement des suggestions">
        <div v-for="item in 6" :key="item" class="suggestion-skeleton"></div>
      </div>
      <p v-else-if="suggestionsError" class="suggestion-error" role="alert">{{ suggestionsError }}</p>
      <div v-else-if="!suggestions.length" class="search-state"><span class="search-empty-mark" aria-hidden="true">✳</span><h3>Tu es parmi les premiers</h3><p>Les profils des nouveaux membres apparaîtront ici.</p></div>
      <div v-else class="suggestion-grid">
        <article v-for="member in suggestions" :key="member.id" class="suggestion-member">
          <RouterLink class="suggestion-profile" :to="`/profil/${encodeURIComponent(member.id)}`">
            <img :src="member.photo || defaultPhoto" :alt="`Photo de ${member.pseudo}`" />
            <strong>{{ member.pseudo }}</strong>
            <span>{{ member.bio || "Membre de la communauté" }}</span>
          </RouterLink>
          <RouterLink class="visit-profile" :to="`/profil/${encodeURIComponent(member.id)}`">Voir le profil</RouterLink>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue";
import { DEFAULT_PROFILE_PHOTO, useUserStore } from "../stores/userStore";
import { searchUsers, subscribeMembers } from "../services/socialService";

const userStore = useUserStore();
const defaultPhoto = DEFAULT_PROFILE_PHOTO;
const searchInput = ref(null);
const searchText = ref("");
const results = ref([]);
const suggestions = ref([]);
const isLoading = ref(false);
const suggestionsLoading = ref(true);
const searchError = ref("");
const suggestionsError = ref("");
let searchTimer = null;
let stopMembers = null;
let requestId = 0;

onMounted(() => {
  stopMembers = subscribeMembers(members => {
    suggestions.value = members.filter(member => member.id !== userStore.user.uid).slice(0, 12);
    suggestionsLoading.value = false;
    suggestionsError.value = "";
  }, error => {
    console.error("Suggestions Firebase error", error);
    suggestionsLoading.value = false;
    suggestionsError.value = "Les suggestions n’ont pas pu être chargées. Vérifie les règles Firestore.";
  });
});

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
  stopMembers?.();
});

watch(searchText, value => {
  if (searchTimer) clearTimeout(searchTimer);
  const currentRequest = ++requestId;
  searchError.value = "";
  if (value.length < 2) {
    results.value = [];
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  searchTimer = setTimeout(() => runSearch(value, currentRequest), 300);
});

async function runSearch(value, currentRequest = requestId) {
  const term = value.trim();
  if (term.length < 2) return;
  isLoading.value = true;
  searchError.value = "";
  try {
    const matches = await searchUsers(term, userStore.user.uid);
    if (currentRequest === requestId) results.value = matches;
  } catch (error) {
    console.error("Search Firebase error", error);
    if (currentRequest === requestId) searchError.value = "La recherche n’a pas pu aboutir. Vérifie les règles Firestore.";
  } finally {
    if (currentRequest === requestId) isLoading.value = false;
  }
}

function clearSearch() {
  searchText.value = "";
  results.value = [];
  searchError.value = "";
  searchInput.value?.focus();
}
</script>

<style scoped>
.search-page { width: min(100%, 900px); margin: 0 auto; color: #23332d; }
.page-heading { margin-bottom: 25px; }
.page-eyebrow { margin: 0 0 7px; color: #66836f; font-size: 10px; font-weight: 700; }
.page-heading h1 { margin: 0; color: #19382f; font: 600 30px/1.15 'Space Grotesk', sans-serif; }
.page-description { margin: 8px 0 0; color: #77847d; font-size: 13px; }
.search-box { display: flex; width: min(100%, 620px); height: 50px; align-items: center; gap: 12px; padding: 0 15px; border: 1px solid #dfe6de; border-radius: 6px; background: #fff; box-shadow: 0 5px 18px rgba(25,56,47,.04); }
.search-box:focus-within { border-color: #8ca57d; box-shadow: 0 0 0 3px rgba(139,168,113,.14); }
.search-box svg { width: 20px; height: 20px; flex: 0 0 20px; fill: none; stroke: #718078; stroke-linecap: round; stroke-width: 1.8; }
.search-box input { width: 100%; min-width: 0; border: 0; outline: 0; color: #19382f; background: transparent; font: 14px 'DM Sans', sans-serif; }
.search-box input::placeholder { color: #9aa49e; }
.search-clear { padding: 6px 0 6px 8px; border: 0; color: #557358; background: transparent; font-size: 11px; font-weight: 700; cursor: pointer; }
.search-section { margin-top: 37px; }
.search-section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 15px; }
.search-section-heading .page-eyebrow { margin-bottom: 5px; }
.search-section-heading h2 { margin: 0; color: #253a30; font: 600 18px 'Space Grotesk', sans-serif; }
.result-count { display: grid; min-width: 25px; height: 25px; place-items: center; padding: 0 7px; border-radius: 50%; color: #5c7063; background: #e8eee7; font-size: 10px; }
.search-member-list { width: min(100%, 700px); border-top: 1px solid #e6ebe5; }
.search-member { display: flex; min-height: 77px; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 4px; border-bottom: 1px solid #e6ebe5; }
.search-member-profile { display: flex; min-width: 0; align-items: center; gap: 13px; color: inherit; text-decoration: none; }
.search-member-profile img { width: 48px; height: 48px; flex: 0 0 48px; border: 1px solid #e4e9e3; border-radius: 50%; object-fit: cover; }
.search-member-copy { display: grid; min-width: 0; gap: 4px; }
.search-member-copy strong { overflow: hidden; color: #263c31; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.search-member-copy small { overflow: hidden; max-width: 400px; color: #7b8880; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.visit-profile { display: inline-flex; min-height: 34px; flex: 0 0 auto; align-items: center; justify-content: center; padding: 0 12px; border-radius: 4px; color: #2f503c; background: #eaf2e4; font-size: 10px; font-weight: 700; text-decoration: none; }
.visit-profile:hover { background: #dcebcf; }
.search-state { display: grid; min-height: 190px; justify-items: center; align-content: center; gap: 7px; padding: 24px; color: #7b8880; text-align: center; }
.search-state h3 { margin: 4px 0 0; color: #34483b; font: 600 15px 'Space Grotesk', sans-serif; }
.search-state p { max-width: 340px; margin: 0; font-size: 12px; line-height: 1.55; }
.search-empty-mark { color: #63805c; font-size: 28px; line-height: 1; }
.search-state--error { color: #a64e43; }
.search-spinner { width: 24px; height: 24px; border: 2px solid #dce6d8; border-top-color: #628058; border-radius: 50%; animation: search-spin .8s linear infinite; }
.suggestion-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.suggestion-member { display: grid; min-width: 0; justify-items: center; gap: 12px; padding: 20px 14px 14px; border: 1px solid #e3e9e1; border-radius: 6px; background: #fff; text-align: center; }
.suggestion-profile { display: grid; width: 100%; min-width: 0; justify-items: center; gap: 9px; color: inherit; text-decoration: none; }
.suggestion-profile img { width: 68px; height: 68px; border: 1px solid #e5eae3; border-radius: 50%; object-fit: cover; }
.suggestion-profile strong { max-width: 100%; overflow: hidden; color: #263c31; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.suggestion-profile span { display: -webkit-box; min-height: 28px; overflow: hidden; color: #7b8880; font-size: 10px; line-height: 1.4; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.suggestion-member .visit-profile { width: 100%; box-sizing: border-box; }
.suggestion-skeleton { height: 155px; border-radius: 6px; background: linear-gradient(90deg, #edf1eb 25%, #f7f8f6 50%, #edf1eb 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.2s ease-in-out infinite; }
.suggestion-error { color: #a64e43; font-size: 12px; }
@keyframes search-spin { to { transform: rotate(360deg); } }
@keyframes skeleton-shimmer { to { background-position: -200% 0; } }
@media (max-width: 900px) { .suggestion-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 600px) {
  .page-heading h1 { font-size: 25px; }
  .page-description { max-width: 300px; font-size: 11px; line-height: 1.5; }
  .search-section { margin-top: 29px; }
  .suggestion-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
  .suggestion-member { padding: 17px 10px 11px; }
  .suggestion-profile img { width: 60px; height: 60px; }
  .search-member { gap: 8px; }
  .search-member-profile { gap: 9px; }
  .search-member-profile img { width: 42px; height: 42px; flex-basis: 42px; }
  .search-member-copy small { max-width: 190px; }
  .search-member .visit-profile { min-height: 32px; padding: 0 8px; font-size: 9px; }
}
</style>