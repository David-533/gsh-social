// Store Pinia pour gérer l'état de l'utilisateur connecté
import { defineStore } from "pinia";

/**
 * Store utilisateur
 * Gère la connexion, l'inscription et déconnexion de l'utilisateur
 */
export const useUserStore = defineStore("user", {
  // État initial de l'application
  state: () => ({
    user: JSON.parse(localStorage.getItem("user")) || null, // un seul utilisateur stocké
    isLoggedIn: !!localStorage.getItem("user"), // booléen indiquant si l'utilisateur est connecté
  }),

  // Actions (fonctions qui modifient l'état)
  actions: {
    /**
     * Enregistre un nouvel utilisateur
     * @param {string} pseudo - Le pseudo de l'utilisateur
     * @param {string} email - L'email de l'utilisateur
     * @param {string} password - Le mot de passe de l'utilisateur
     */
    register(pseudo, email, password) {
      // Efface l'ancien utilisateur s'il existe
      this.user = null;
      localStorage.removeItem("user");

      // Crée et stocke le nouvel utilisateur dans le state et localStorage
      const newUser = { pseudo, email, password };
      this.user = newUser;
      localStorage.setItem("user", JSON.stringify(newUser));
    },

    /**
     * Vérifie les identifiants et connecte l'utilisateur
     * @param {string} pseudo - Le pseudo à vérifier
     * @param {string} password - Le mot de passe à vérifier
     * @returns {boolean} true si les identifiants sont corrects, false sinon
     */
    login(pseudo, password) {
      if (!this.user) return false;
      if (this.user.pseudo === pseudo && this.user.password === password) {
        this.isLoggedIn = true;
        return true;
      }
      return false;
    },

    /**
     * Déconnecte l'utilisateur
     * Réinitialise l'état et supprime los données du localStorage
     */
    logout() {
      this.user = null;
      this.isLoggedIn = false;
      localStorage.removeItem("user");
    },

    /**
     * Efface les données de l'utilisateur
     * Similaire à logout mais utilisé dans certains contextes
     */
    clearUser() {
      this.user = null;
      this.isLoggedIn = false;
      localStorage.removeItem("user");
    },
  },
});

