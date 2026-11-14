// Configuration du routeur Vue Router pour la navigation entre pages
import { createRouter, createWebHistory } from 'vue-router';
import Login from '../Views/Login.vue';
import Inscription from '../Views/Inscription.vue';
import Home from '../Views/Home.vue';
import Profil from '../Views/Profil.vue';
import Messages from '../Views/Messages.vue';
import Search from '../Views/Search.vue';
import Settings from '../Views/Settings.vue';
import ModifierProfil from '../Views/ModifierProfil.vue';
import { useUserStore } from "../stores/userStore";
import { auth } from "../firebase";

/**
 * Définit les routes de l'application
 * Chaque route relie un chemin URL à un composant Vue
 */
const routes = [
  { path: '/', name: 'login', component: Login },            // Route par défaut - page de connexion
  { path: '/login', name: 'loginPage', component: Login },   // Route explicite pour la connexion
  { path: '/inscription', name: 'Inscription', component: Inscription }, // Page d'inscription
  { path: '/home', name: 'Home', component: Home, meta: { social: true } },
  { path: '/profil', name: 'Profil', component: Profil, meta: { social: true } },
  { path: '/profil/:memberId', name: 'MemberProfile', component: Profil, meta: { social: true } },
  { path: '/messages', name: 'Messages', component: Messages, meta: { social: true } },
  { path: '/recherche', name: 'Recherche', component: Search, meta: { social: true } },
  { path: '/parametres', name: 'Parametres', component: Settings, meta: { social: true } },
  { path: '/modifier-profil', name: 'ModifierProfil', component: ModifierProfil, meta: { social: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' }               // Redirige vers la page de connexion si la route n'existe pas
];

/**
 * Crée l'instance du routeur
 * - createWebHistory : utilise l'historique du navigateur (URLs propres)
 * - routes : les chemins définis au-dessus
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async to => {
  const userStore = useUserStore();
  const isPublicRoute = ["login", "loginPage", "Inscription"].includes(to.name);
  await auth.authStateReady();
  const hasSession = userStore.isLoggedIn && Boolean(userStore.user?.uid) && auth.currentUser?.uid === userStore.user.uid;

  if (!hasSession && userStore.isLoggedIn) userStore.logout();
  if (to.meta.social && !hasSession) return { name: "login" };
  if (isPublicRoute && hasSession) return { name: "Home" };
});

export default router;

