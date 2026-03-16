import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
  state: () => ({
    user: JSON.parse(localStorage.getItem("user")) || null, // un seul utilisateur
    isLoggedIn: !!localStorage.getItem("user"),
  }),

  actions: {
    register(pseudo, email, password) {
      // Efface l'ancien utilisateur
      this.user = null;
      localStorage.removeItem("user");

      // Crée le nouvel utilisateur
      const newUser = { pseudo, email, password };
      this.user = newUser;
      localStorage.setItem("user", JSON.stringify(newUser));
    },

    login(pseudo, password) {
      if (!this.user) return false;
      if (this.user.pseudo === pseudo && this.user.password === password) {
        this.isLoggedIn = true;
        return true;
      }
      return false;
    },

    logout() {
      this.user = null;
      this.isLoggedIn = false;
      localStorage.removeItem("user");
    },

    clearUser() {
      this.user = null;
      this.isLoggedIn = false;
      localStorage.removeItem("user");
    },
  },
});

