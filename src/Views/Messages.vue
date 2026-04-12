<template>
  <div class="page-container">
    <!-- Navbar -->
    <nav class="navbar">
      <div class="title">SOCIAL</div>

      <div class="nav-links">
        <router-link to="/home" class="nav-item">Accueil</router-link>
        <router-link to="/profil" class="nav-item">Profile</router-link>
        <router-link to="/messages" class="nav-item">Messages</router-link>
      </div>

      <button class="logout-btn" @click="handleLogout">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M10 17v-3H3v-4h7V7l5 5-5 5zM20 3h-8v2h8v14h-8v2h8c1.1 0 2-0.9 2-2V5c0-1.1-0.9-2-2-2z"/>
        </svg>
      </button>
    </nav>

    <!-- Contenu -->
    <div class="content">
      <h1>Messages</h1>

      <div class="messages-layout">

        <!-- Profil utilisateur -->
        <div class="user-profile">
          <img :src="userPhoto" alt="" class="user-photo" />
          <h3 class="user-name">{{ userPseudo }}</h3>
        </div>

        <!-- Ligne verticale -->
        <div class="vertical-line"></div>

        <!-- Zone de chat -->
        <div class="chat-area">

          <!-- Zone d'affichage des messages -->
          <div class="chat-box">
            <div v-for="msg in messages" :key="msg.id" class="chat-message">

              <!-- Message utilisateur -->
              <div v-if="!msg.fromBot" class="msg-user">
                <img :src="msg.photo" class="chat-photo" />
                <strong>{{ msg.user }} :</strong> {{ msg.text }}
              </div>

              <!-- Message bot -->
              <div v-else class="msg-bot">
                <img :src="msg.photo" class="chat-photo" />
                <strong>{{ msg.user }} :</strong> {{ msg.text }}
              </div>

            </div>
          </div>

          <!-- Zone d'écriture -->
          <div class="chat-input">
            <input 
              v-model="newMessage"
              type="text"
              placeholder="Écrire un message..."
            />
            <button @click="sendMessage">Envoyer</button>
          </div>

        </div>

      </div>
    </div>
  </div>
</template>

<script>
/**
 * Composant Messages - Page de chat avec le bot Groq
 * Permet d’envoyer des messages et de recevoir des réponses de l’IA
 */
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";

export default {
  name: "Messages",
  setup() {
    const router = useRouter();
    const userPseudo = ref("");
    const userPhoto = ref("/default_pp.png");

    // Objet bot avec le nom et la photo de profil du bot
    const bot = {
      name: "Fey",
      photo: "https://docs.nestjs.com/assets/logo-small-gradient.svg"
    };

    const messages = ref(JSON.parse(localStorage.getItem("messages") || "[]"));
    const newMessage = ref("");
    const isLoading = ref(false);

    /**
     * Met à jour les anciens messages de l’utilisateur avec le nouveau pseudo et la nouvelle photo
     * @param {string} oldPseudo - L’ancien pseudo de l’utilisateur
     * @param {string} newPseudo - Le nouveau pseudo de l’utilisateur
     * @param {string} newPhoto - La nouvelle photo de profil de l’utilisateur
     */
    const updateMessagesProfile = (oldPseudo, newPseudo, newPhoto) => {
      messages.value.forEach(msg => {
        if (!msg.fromBot && msg.user === oldPseudo) {
          msg.user = newPseudo;
          msg.photo = newPhoto;
        }
      });
    };

    /**
     * Met à jour les anciens messages du bot avec le nouveau nom et la nouvelle photo
     * (renommage automatique si le bot change)
     */
    const updateBotMessages = () => {
      messages.value.forEach(msg => {
        if (msg.fromBot) {
          msg.user = bot.name;
          msg.photo = bot.photo;
        }
      });
    };

    /**
     * Envoie un message à l’API du serveur (Groq)
     * Ajoute d’abord le message de l’utilisateur au chat
     * Puis envoie la requête au serveur pour obtenir une réponse du bot
     * En cas d’erreur, affiche un message d’erreur
     */
    const sendMessage = async () => {
      if (!newMessage.value.trim() || isLoading.value) return;

      const userText = newMessage.value;
      const currentUser = userPseudo.value || "Utilisateur";

      // Ajoute le message de l’utilisateur au chat
      messages.value.push({
        id: Date.now(),
        user: currentUser,
        photo: userPhoto.value,
        text: userText,
        fromBot: false
      });

      newMessage.value = "";  // Réinitialise le champ de saisie
      isLoading.value = true;

      try {
        // Appelle le serveur Express pour obtenir une réponse du bot
        const response = await fetch("http://localhost:3001/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            user: currentUser
          })
        });

        const data = await response.json();

        // Ajoute la réponse du bot au chat
        messages.value.push({
          id: Date.now() + 1,
          user: bot.name,
          photo: bot.photo,
          text: data.reply || "Je n’ai pas compris, peux-tu reformuler ?",
          fromBot: true
        });

      } catch (err) {
        console.error("Erreur bot :", err);

        // Affiche un message d’erreur si le bot est indisponible
        messages.value.push({
          id: Date.now() + 2,
          user: bot.name,
          photo: bot.photo,
          text: "Le bot est indisponible pour le moment.",
          fromBot: true
        });
      }

      isLoading.value = false;
    };

    /**
     * Watcher pour sauvegarder automatiquement les messages dans localStorage
     * L’option deep: true permet de surveiller les changements en profondeur
     */
    watch(messages, (newVal) => {
      localStorage.setItem("messages", JSON.stringify(newVal));
    }, { deep: true });

    /**
     * Charge les données utilisateur au montage du composant
     * Met à jour les messages existants si le profil a changé
     */
    onMounted(() => {
      const storedPseudo = localStorage.getItem("userPseudo") || "";
      const storedPhoto = localStorage.getItem("userPhoto") || "/default_pp.png";

      userPseudo.value = storedPseudo;
      userPhoto.value = storedPhoto;

      updateMessagesProfile(storedPseudo, storedPseudo, storedPhoto);

      // Renomme les anciens messages du bot avec le nom correct
      updateBotMessages();
    });

    /**
     * Écoute les changements de localStorage (par exemple si le profil est modifié)
     * Met à jour les messages avec le nouveau pseudo et la nouvelle photo
     */
    window.addEventListener("storage", () => {
      const newPseudo = localStorage.getItem("userPseudo") || "";
      const newPhoto = localStorage.getItem("userPhoto") || "/default_pp.png";

      const oldPseudo = userPseudo.value || newPseudo;

      userPseudo.value = newPseudo;
      userPhoto.value = newPhoto;

      updateMessagesProfile(oldPseudo, newPseudo, newPhoto);
      updateBotMessages();
    });

    /**
     * Gère la déconnexion de l’utilisateur
     * Supprime les données de session et redirige vers le login
     */
    const handleLogout = () => {
      localStorage.removeItem("userPseudo");
      localStorage.removeItem("userPhoto");
      localStorage.removeItem("isLogged");
      router.push("/login");
    };

    return { 
      userPseudo, 
      userPhoto, 
      handleLogout,
      messages,
      newMessage,
      sendMessage,
      isLoading
    };
  },
};
</script>



<style scoped>
/* Conteneur général */
.page-container {
  display: flex;
}

.navbar {
  width: 200px;
  height: 100vh;
  background-color: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  box-shadow: 2px 0 5px rgba(0,0,0,0.5);
  position: fixed;
  top: 0;
  left: 0;
  font-family: 'Roboto', sans-serif;
}

.title {
  font-size: 1.5rem; /* même que Home.vue */
  color: #fff;
  margin-bottom: 40px;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  align-items: center;
}

.nav-item {
  color: #fff;
  font-family: 'Roboto', sans-serif;
  font-size: 1.5rem; /* même que Home.vue */
  width: 100%;
  text-align: center;
  padding: 5px 0;
  text-decoration: none;
}

.nav-item:hover {
  background-color: transparent;
  text-decoration: none;
}

.logout-btn {
  background: none;
  border: none;
  margin-top: 600px;
  cursor: pointer;
  padding: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn svg {
  fill: white;
  width: 30px;
  height: 30px;
}

.logout-btn:hover svg {
  transform: scale(1.2);
  transition: transform 0.2s;
}


/* === CONTENU PRINCIPAL === */
.content {
  margin-left: 200px; /* espace pour la navbar */
  padding: 40px;
  color: #222;
}

.content h1 {
  font-size: 2rem;
  margin-bottom: 10px;
}

.content p {
  font-size: 1.3rem;
}
.messages-layout {
  display: flex;
  margin-top: 20px;
  gap: 20px;
}

/* Profil utilisateur */
.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 10px;
  align-self: flex-start;
}

.user-photo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.user-name {
  margin: 0;
  font-size: 1rem;
}


/* Ligne verticale */
.vertical-line {
  width: 1px;
  height: 620px;
  background-color: #000;
}

/* Zone de chat */
.chat-area {
  margin-left: 20px;
  width: 600px;
}

.chat-box {
  height: 500px;      /* ✅ augmente la hauteur */
  width: 1400px;        /* ✅ prend toute la largeur disponible */
  border: none;
  padding: 10px;      /* ✅ petit padding pour respirer */
  margin-top: 20px;
  background: none;
  border-radius: 0;
  overflow-y: auto;
}



.chat-message {
  margin-bottom: 8px;
}

.chat-input {
  display: flex;
  gap: 10px;
  margin-top: 40px;   /* ✅ descend la zone de saisie */
}

.chat-input input {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #aaa;
  font-size: 1rem;
}

.chat-input button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #1cb5e0, #2af598);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.chat-photo {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  object-fit: cover;
}

.msg-user {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  margin-left: 800px; /* ✅ pousse tout le bloc à droite */
  
  max-width: 41%;            /* ✅ limite la largeur du bloc */
  background:linear-gradient(135deg, #d689b0, #2af598);
  padding: 10px 14px;        /* ✅ espace interne */
  border-radius: 12px;       /* ✅ arrondi bulle */
  word-break: break-word;    /* ✅ évite les débordements */
 
}
.msg-bot {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;

  max-width: 50%;            /* ✅ limite la largeur du bloc */
  background:linear-gradient(135deg, #9face6, #75bdec);
  padding: 10px 14px;        /* ✅ espace interne */
  border-radius: 12px;       /* ✅ arrondi bulle */
  word-break: break-word;    /* ✅ évite les débordements */
}

</style>