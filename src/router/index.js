// Configuration du routeur Vue Router pour la navigation entre pages
import { createRouter, createWebHistory } from 'vue-router';
import Login from '../Views/Login.vue';
import Inscription from '../Views/Inscription.vue';
import Home from '../Views/Home.vue';
import Profil from '../Views/Profil.vue';
import Messages from '../Views/Messages.vue';
import ModifierProfil from '../Views/ModifierProfil.vue';

/**
 * Définit les routes de l'application
 * Chaque route relie un chemin URL à un composant Vue
 */
const routes = [
  { path: '/', name: 'login', component: Login },            // Route par défaut - page de connexion
  { path: '/login', name: 'loginPage', component: Login },   // Route explicite pour la connexion
  { path: '/inscription', name: 'Inscription', component: Inscription }, // Page d'inscription
  { path: '/home', name: 'Home', component: Home },          // Page d'accueil avec les posts
  { path: '/profil', name: 'Profil', component: Profil },    // Profil de l'utilisateur
  { path: '/messages', name: 'Messages', component: Messages }, // Page de chat avec le bot
  { path: '/modifier-profil', name: 'ModifierProfil', component: ModifierProfil }, // Page pour modifier le profil
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

export default router;

