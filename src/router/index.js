import { createRouter, createWebHistory } from 'vue-router';
import Login from '../Views/Login.vue';
import Inscription from '../Views/Inscription.vue';
import Home from '../Views/Home.vue';
import Profil from '../Views/Profil.vue';
import Messages from '../Views/Messages.vue';
import ModifierProfil from '../Views/ModifierProfil.vue';

const routes = [
  { path: '/', name: 'login', component: Login },            // page login
  { path: '/login', name: 'loginPage', component: Login },   // route explicite pour login
  { path: '/inscription', name: 'Inscription', component: Inscription },
  { path: '/home', name: 'Home', component: Home },          // page d'accueil
  { path: '/profil', name: 'Profil', component: Profil },
  { path: '/messages', name: 'Messages', component: Messages },
  { path: '/modifier-profil', name: 'ModifierProfil', component: ModifierProfil }, // <-- nouvelle route
  { path: '/:pathMatch(.*)*', redirect: '/' }               // redirection par défaut
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;

