<template>
  <main class="social-page messages-page">
    <header class="page-heading">
      <div><p class="page-eyebrow">RESTER EN LIEN</p><h1>Messages</h1><p class="page-description">Tes conversations, au même endroit.</p></div>
    </header>

    <section class="messenger" aria-label="Messagerie">
      <aside class="conversation-sidebar">
        <div class="conversation-sidebar-heading"><h2>Conversations</h2><span>1</span></div>
        <button class="conversation-item" type="button" aria-current="page">
          <span class="assistant-avatar" aria-hidden="true">f</span>
          <span class="conversation-copy"><strong>Fey</strong><small>Assistant de communauté</small></span>
          <span class="online-dot" aria-label="Disponible"></span>
        </button>
      </aside>

      <section class="chat-panel" aria-label="Conversation avec Fey">
        <header class="chat-header">
          <span class="assistant-avatar" aria-hidden="true">f</span>
          <div><strong>Fey</strong><span>Assistant de communauté</span></div>
          <span class="chat-status"><i></i> Disponible</span>
        </header>

        <div class="chat-box" aria-live="polite">
          <div v-if="!messages.length" class="conversation-empty">
            <span class="assistant-avatar assistant-avatar--large" aria-hidden="true">f</span>
            <h2>Bonjour {{ userPseudo }}</h2>
            <p>Je suis là pour discuter, répondre à tes questions ou t’aider à trouver quoi partager.</p>
          </div>
          <article v-for="msg in messages" :key="msg.id" class="chat-message" :class="msg.fromBot ? 'chat-message--assistant' : 'chat-message--user'">
            <img v-if="msg.fromBot" :src="msg.photo" :alt="`Photo de ${msg.user}`" class="chat-photo" />
            <div class="message-bubble">
              <strong>{{ msg.user }}</strong>
              <p>{{ msg.text }}</p>
            </div>
          </article>
          <p v-if="isLoading" class="assistant-typing">Fey rédige une réponse…</p>
        </div>

        <form class="chat-input" @submit.prevent="sendMessage">
          <input v-model="newMessage" type="text" aria-label="Écrire un message" placeholder="Écrire un message…" :disabled="isLoading" />
          <button type="submit" :disabled="isLoading || !newMessage.trim()" aria-label="Envoyer le message">
            <span>Envoyer</span><span aria-hidden="true">↗</span>
          </button>
        </form>
      </section>
    </section>
  </main>
</template>

<script>
/**
 * Composant Messages - Page de chat avec le bot Groq
 * Permet d’envoyer des messages et de recevoir des réponses de l’IA
 */
import { ref, watch } from "vue";
import { DEFAULT_PROFILE_PHOTO, useUserStore } from "../stores/userStore";

export default {
  name: "Messages",
  setup() {
    const userStore = useUserStore();
    const chatApiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const profile = userStore.getProfile();
    const userPseudo = ref(profile.pseudo || "Utilisateur");
    const userPhoto = ref(profile.photo || DEFAULT_PROFILE_PHOTO);

    // Objet bot avec le nom et la photo de profil du bot
    const bot = {
      name: "Fey",
      photo: DEFAULT_PROFILE_PHOTO
    };

    const messages = ref(userStore.getUserData("messages", []));
    const newMessage = ref("");
    const isLoading = ref(false);

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
        const response = await fetch(`${chatApiUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            user: currentUser
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Le service de messagerie est indisponible.");

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
      userStore.setUserData("messages", newVal);
    }, { deep: true });

    return { 
      userPseudo, 
      userPhoto, 
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
  width: min(600px, calc(100% - 20px));
  min-width: 0;
}

.chat-box {
  height: 500px;      /* ✅ augmente la hauteur */
  width: 100%;
  box-sizing: border-box;
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
  margin-left: auto;
  
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

@media (max-width: 700px) {
  .page-container { display: block; min-width: 0; }
  .navbar {
    width: 100%;
    height: auto;
    min-height: 62px;
    flex-direction: row;
    justify-content: space-between;
    padding: 8px 10px;
    z-index: 1000;
  }
  .title { margin: 0; font-size: 1rem; }
  .nav-links { width: auto; flex: 1; flex-direction: row; justify-content: center; gap: 2px; }
  .nav-item { width: auto; padding: 8px 6px; font-size: .78rem; white-space: nowrap; }
  .logout-btn { width: auto; margin: 0; padding: 8px; }
  .logout-btn svg { width: 24px; height: 24px; }
  .content { width: 100%; min-width: 0; margin: 0; padding: 82px 12px 24px; box-sizing: border-box; }
  .content h1 { font-size: 1.5rem; }
  .content p { font-size: 1rem; }
  .messages-layout { width: 100%; flex-direction: column; gap: 14px; }
  .user-profile { margin: 0; }
  .vertical-line { display: none; }
  .chat-area { width: 100%; min-width: 0; margin: 0; }
  .chat-box { width: 100%; height: 55vh; min-height: 280px; margin-top: 0; padding: 8px 0; box-sizing: border-box; overflow-x: hidden; }
  .chat-input { gap: 8px; margin-top: 12px; }
  .chat-input input { min-width: 0; }
  .chat-input button { flex: 0 0 auto; padding: 10px 12px; }
  .msg-user { width: fit-content; max-width: 85%; margin-left: auto; flex-wrap: wrap; }
  .msg-bot { width: fit-content; max-width: 85%; flex-wrap: wrap; }
}

@media (min-width: 701px) and (max-width: 1000px) {
  .content { padding: 32px 24px; }
  .messages-layout { display: grid; grid-template-columns: minmax(0, 1fr); }
  .vertical-line { display: none; }
  .chat-area { width: 100%; margin: 0; }
  .chat-box { height: 48vh; }
  .msg-user { max-width: 75%; }
  .msg-bot { max-width: 75%; }
}

.messages-page .page-heading { margin-bottom: 20px; }
.messages-page .page-heading h1 { margin: 0; color: #19382f; font: 600 28px 'Space Grotesk', sans-serif; }
.messages-page .page-eyebrow { margin: 0 0 6px; color: #66836f; font-size: 9px; font-weight: 700; }
.messages-page .page-description { margin: 6px 0 0; color: #78857d; font-size: 12px; }
.messenger { display: grid; min-height: min(680px, calc(100svh - 190px)); grid-template-columns: 235px minmax(0, 1fr); overflow: hidden; border: 1px solid #e1e8e0; border-radius: 7px; background: #fff; }
.conversation-sidebar { padding: 18px 12px; border-right: 1px solid #e8ede7; background: #fcfdfb; }
.conversation-sidebar-heading { display: flex; align-items: center; justify-content: space-between; padding: 0 7px 13px; }
.conversation-sidebar-heading h2 { margin: 0; color: #314238; font-size: 12px; }
.conversation-sidebar-heading > span { color: #8a958d; font-size: 10px; }
.conversation-item { display: flex; width: 100%; align-items: center; gap: 9px; padding: 10px 8px; border: 0; border-radius: 5px; background: #edf4e5; text-align: left; cursor: pointer; }
.assistant-avatar { display: grid; width: 38px; height: 38px; flex: 0 0 38px; place-items: center; border-radius: 50%; color: #19382f; background: #c9ef74; font: 700 20px 'Space Grotesk', sans-serif; }
.conversation-copy { display: grid; min-width: 0; flex: 1; gap: 4px; }
.conversation-copy strong { color: #294033; font-size: 11px; }
.conversation-copy small { overflow: hidden; color: #849087; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.online-dot, .chat-status i { width: 7px; height: 7px; border-radius: 50%; background: #83b56b; }
.chat-panel { display: flex; min-width: 0; flex-direction: column; }
.chat-header { display: flex; min-height: 65px; align-items: center; gap: 10px; padding: 11px 17px; border-bottom: 1px solid #edf0ec; }
.chat-header > div { display: grid; flex: 1; gap: 4px; }
.chat-header strong { color: #294033; font-size: 12px; }
.chat-header > div span { color: #87918a; font-size: 10px; }
.chat-status { display: flex; align-items: center; gap: 6px; color: #738078; font-size: 9px; }
.chat-box { display: flex; width: 100%; min-height: 360px; max-height: 55vh; flex: 1; flex-direction: column; gap: 13px; margin: 0; padding: 18px; box-sizing: border-box; overflow: auto; background: #fff; }
.conversation-empty { display: grid; flex: 1; justify-items: center; align-content: center; padding: 30px 18px; text-align: center; }
.assistant-avatar--large { width: 52px; height: 52px; font-size: 26px; }
.conversation-empty h2 { margin: 13px 0 6px; color: #294033; font: 600 17px 'Space Grotesk', sans-serif; }
.conversation-empty p { max-width: 300px; margin: 0; color: #829087; font-size: 11px; line-height: 1.6; }
.chat-message { display: flex; max-width: 82%; align-items: flex-end; gap: 8px; margin: 0; }
.chat-message--user { align-self: flex-end; }
.chat-message--assistant { align-self: flex-start; }
.chat-photo { width: 28px; height: 28px; flex: 0 0 28px; }
.message-bubble { min-width: 0; padding: 10px 12px; border-radius: 8px; background: #f0f4ee; overflow-wrap: anywhere; }
.chat-message--user .message-bubble { background: #e7f1dc; }
.message-bubble strong { color: #53645a; font-size: 9px; }
.message-bubble p { margin: 4px 0 0; color: #35453b; font-size: 11px; line-height: 1.55; white-space: pre-wrap; }
.assistant-typing { margin: 0 0 0 37px; color: #88948b; font-size: 10px; }
.messages-page .chat-input { align-items: center; gap: 9px; margin: 0; padding: 13px 16px; border-top: 1px solid #edf0ec; }
.messages-page .chat-input input { min-width: 0; height: 40px; padding: 0 12px; border-color: #e0e7df; border-radius: 5px; font-size: 11px; }
.messages-page .chat-input button { display: flex; min-height: 38px; align-items: center; gap: 8px; padding: 0 12px; border-radius: 5px; color: #19382f; background: #c9ef74; font-size: 10px; font-weight: 700; }
.messages-page .chat-input button:disabled { opacity: .5; cursor: not-allowed; }

@media (max-width: 760px) {
  .messages-page .page-heading { margin-bottom: 14px; }
  .messages-page .page-heading h1 { font-size: 24px; }
  .messenger { min-height: calc(100svh - 190px); grid-template-columns: minmax(0, 1fr); }
  .conversation-sidebar { display: none; }
  .chat-header { min-height: 58px; padding: 9px 12px; }
  .chat-status { font-size: 8px; }
  .chat-box { min-height: 320px; max-height: none; padding: 13px 11px; }
  .chat-message { max-width: 92%; }
  .messages-page .chat-input { padding: 10px; }
  .messages-page .chat-input button { padding: 0 10px; }
  .messages-page .chat-input button span:first-child { display: none; }
}

</style>