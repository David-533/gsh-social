<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { signOut } from "firebase/auth";
import { DEFAULT_PROFILE_PHOTO, useUserStore } from "../stores/userStore";
import { auth } from "../firebase";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const profile = computed(() => userStore.getProfile());
const displayName = computed(() => profile.value.pseudo || "Utilisateur");
const avatar = computed(() => profile.value.photo || DEFAULT_PROFILE_PHOTO);
const links = [
  { to: "/home", label: "Accueil", icon: "home" },
  { to: "/recherche", label: "Recherche", icon: "search" },
  { to: "/profil", label: "Profil", icon: "profile" },
  { to: "/messages", label: "Messages", icon: "messages" },
  { to: "/parametres", label: "Paramètres", icon: "settings" },
];

const isActive = path => route.path === path || (path === "/profil" && route.path === "/modifier-profil");

const logout = async () => {
  await signOut(auth).catch(() => {});
  userStore.logout();
  await router.push("/login");
};
</script>

<template>
  <div class="social-shell">
    <aside class="desktop-sidebar">
      <div class="sidebar-brand">
        <span class="brand-symbol">s</span>
        <span>cercle<span class="brand-dot">.</span></span>
      </div>

      <p class="sidebar-label">TON ESPACE</p>
      <nav class="primary-nav" aria-label="Navigation principale">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{ 'nav-link--active': isActive(link.to) }"
          :aria-current="isActive(link.to) ? 'page' : undefined"
        >
          <svg v-if="link.icon === 'home'" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg>
          <svg v-else-if="link.icon === 'profile'" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0" /></svg>
          <svg v-else-if="link.icon === 'messages'" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5" /></svg>
          <svg v-else-if="link.icon === 'settings'" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2"/></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5" /></svg>
          <span>{{ link.label }}</span>
        </RouterLink>
      </nav>

      <RouterLink class="compose-link" to="/home?compose=1">
        <span aria-hidden="true">＋</span>
        <span>Créer une publication</span>
      </RouterLink>

      <div class="sidebar-account">
        <img :src="avatar" :alt="`Photo de ${displayName}`" />
        <div class="account-copy">
          <strong>{{ displayName }}</strong>
          <span>Mon compte</span>
        </div>
        <button class="logout-button" type="button" title="Se déconnecter" aria-label="Se déconnecter" @click="logout">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17v-3H3v-4h7V7l5 5-5 5zM20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" /></svg>
        </button>
      </div>
    </aside>

    <header class="mobile-header">
      <div class="sidebar-brand">
        <span class="brand-symbol">s</span>
        <span>cercle<span class="brand-dot">.</span></span>
      </div>
      <div class="mobile-account">
        <span>{{ displayName }}</span>
        <button class="logout-button" type="button" title="Se déconnecter" aria-label="Se déconnecter" @click="logout">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17v-3H3v-4h7V7l5 5-5 5zM20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" /></svg>
        </button>
      </div>
    </header>

    <main class="social-workspace">
      <div class="workspace-inner"><slot /></div>
    </main>

    <nav class="mobile-nav" aria-label="Navigation principale">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link--active': isActive(link.to) }"
        :aria-current="isActive(link.to) ? 'page' : undefined"
      >
        <svg v-if="link.icon === 'home'" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg>
        <svg v-else-if="link.icon === 'profile'" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0" /></svg>
        <svg v-else-if="link.icon === 'messages'" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5" /></svg>
        <svg v-else-if="link.icon === 'settings'" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2"/></svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5" /></svg>
        <span>{{ link.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.social-shell {
  --ink: #19382f;
  --muted: #788780;
  --line: #e2e8e2;
  --paper: #f5f7f3;
  --accent: #c9ef74;
  min-height: 100svh;
  color: #23332d;
  background: var(--paper);
  font-family: 'DM Sans', sans-serif;
}

.desktop-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 20;
  display: flex;
  width: 248px;
  flex-direction: column;
  padding: 27px 19px 18px;
  border-right: 1px solid var(--line);
  background: #fff;
}

.sidebar-brand { display: flex; align-items: center; gap: 10px; color: var(--ink); font: 700 22px/1 'Space Grotesk', sans-serif; }
.brand-symbol { display: grid; width: 34px; height: 34px; place-items: center; color: var(--ink); background: var(--accent); font-size: 24px; }
.brand-dot { color: #e77b5d; }
.sidebar-label { margin: 45px 0 10px 12px; color: #9aa59f; font-size: 10px; font-weight: 700; }
.primary-nav { display: grid; gap: 5px; }
.nav-link { display: flex; min-height: 46px; align-items: center; gap: 13px; padding: 0 13px; border-radius: 6px; color: #53625b; font-size: 14px; font-weight: 600; text-decoration: none; transition: background .16s ease, color .16s ease; }
.nav-link svg, .mobile-nav-link svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
.nav-link:hover { background: #f2f5ef; color: var(--ink); }
.nav-link--active { color: var(--ink); background: #edf4e5; }
.compose-link { display: flex; min-height: 46px; align-items: center; justify-content: center; gap: 8px; margin-top: 24px; border-radius: 5px; color: var(--ink); background: var(--accent); font-size: 13px; font-weight: 700; text-decoration: none; }
.compose-link span:first-child { font-size: 21px; line-height: 1; }
.sidebar-account { display: flex; align-items: center; gap: 10px; margin-top: auto; padding: 13px 3px 0; border-top: 1px solid var(--line); }
.sidebar-account img { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; }
.account-copy { display: grid; min-width: 0; flex: 1; gap: 3px; }
.account-copy strong { overflow: hidden; color: var(--ink); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.account-copy span { color: var(--muted); font-size: 10px; }
.logout-button { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border: 0; border-radius: 5px; color: #68766f; background: transparent; cursor: pointer; }
.logout-button:hover { color: #9f4437; background: #fff1ed; }
.logout-button svg { width: 18px; height: 18px; fill: currentColor; }

.social-workspace { min-height: 100svh; margin-left: 248px; padding: 36px 34px 60px; }
.workspace-inner { width: min(100%, 1120px); margin: 0 auto; }
.mobile-header, .mobile-nav { display: none; }

@media (max-width: 760px) {
  .desktop-sidebar { display: none; }
  .mobile-header { position: fixed; inset: 0 0 auto; z-index: 30; display: flex; height: 62px; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid var(--line); background: rgba(255,255,255,.96); }
  .mobile-header .sidebar-brand { font-size: 18px; }
  .mobile-header .brand-symbol { width: 30px; height: 30px; font-size: 21px; }
  .mobile-account { display: flex; align-items: center; gap: 7px; color: var(--muted); font-size: 12px; }
  .social-workspace { min-height: 100svh; margin: 0; padding: 78px 14px 92px; }
  .mobile-nav { position: fixed; inset: auto 0 0; z-index: 30; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); min-height: 66px; padding: 6px 4px max(6px, env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: rgba(255,255,255,.97); }
  .mobile-nav-link { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; color: #738078; font-size: 10px; font-weight: 600; text-decoration: none; }
  .mobile-nav-link--active { color: var(--ink); }
  .mobile-nav-link--active svg { color: #5b7d44; }
}
</style>
