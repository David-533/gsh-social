<template>
  <main class="messages-page">
    <header class="page-heading">
      <p class="page-eyebrow">RESTER EN LIEN</p>
      <h1>Messages</h1>
    </header>

    <section class="messenger" aria-label="Messagerie">
      <aside class="conversation-sidebar" :class="{ 'sidebar-hidden': selectedMember }">
        <div class="sidebar-heading"><h2>Messages</h2></div>
        <p v-if="errorMessage && !selectedMember" class="chat-error" role="alert">{{ errorMessage }}</p>
        <div class="message-tabs" role="tablist" aria-label="Boîtes de réception">
          <button v-for="tab in tabs" :key="tab.id" type="button" role="tab" :aria-selected="activeTab === tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }} <span v-if="tabCount(tab.id)">{{ tabCount(tab.id) }}</span></button>
        </div>
        <p v-if="loading">Chargement…</p>
        <p v-else-if="!visibleConversations.length">Aucune conversation ici.</p>
        <button v-for="conversation in visibleConversations" :key="conversation.id" class="conversation-item" type="button" @click="openConversation(conversation)">
          <img :src="members[otherId(conversation)]?.photo || defaultPhoto" alt="" />
          <span><strong>{{ members[otherId(conversation)]?.pseudo || 'Membre' }}</strong><small>{{ conversation.initialText }}</small></span>
        </button>
      </aside>
      <div v-if="!selectedMember" class="messages-empty">
        <div class="empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>
        </div>
        <h2>Aucun message</h2>
        <RouterLink to="/recherche">Découvrir les membres</RouterLink>
      </div>
      <section v-else class="chat-panel" aria-label="Conversation">
        <header class="chat-header">
          <button class="back-button" type="button" aria-label="Retour aux conversations" title="Retour aux conversations" @click="closeConversation">←</button>
          <img :src="selectedMember.photo || defaultPhoto" alt="" />
          <RouterLink :to="`/profil/${encodeURIComponent(selectedMember.id)}`">{{ selectedMember.pseudo || 'Membre' }}</RouterLink>
          <button class="block-button" type="button" :disabled="busy" @click="toggleBlock">{{ blockedIds.includes(selectedMember.id) ? 'Débloquer' : 'Bloquer' }}</button>
        </header>
        <div class="chat-messages" aria-live="polite">
          <p v-if="loadingMember" class="chat-notice">Chargement…</p>
          <template v-else-if="selectedConversation">
            <article class="message-bubble" :class="{ own: selectedConversation.senderId === currentUid }">{{ selectedConversation.initialText }}</article>
            <article v-for="message in conversationMessages" :key="message.id" class="message-bubble" :class="{ own: message.senderId === currentUid }">{{ message.text }}</article>
          </template>
          <p v-else class="chat-notice">Commencer une conversation</p>
        </div>
        <p v-if="errorMessage" class="chat-error" role="alert">{{ errorMessage }}</p>
        <div v-if="blockedIds.includes(selectedMember.id)" class="chat-notice action-notice">Tu as bloqué ce membre.</div>
        <div v-else-if="selectedConversation?.status === 'declined'" class="chat-notice action-notice">Cette demande a été refusée.</div>
        <div v-else-if="canRespondToRequest(selectedConversation, currentUid)" class="request-actions">
          <button type="button" :disabled="busy" @click="respond('declined')">Refuser</button>
          <button type="button" class="primary" :disabled="busy" @click="respond('accepted')">Accepter</button>
        </div>
        <p v-else-if="selectedConversation?.status === 'pending'" class="chat-notice action-notice">Demande envoyée. Attends son acceptation pour écrire à nouveau.</p>
        <form v-else class="chat-input" @submit.prevent="send">
          <input v-model="newMessage" type="text" maxlength="2000" aria-label="Écrire un message" placeholder="Écrire un message…" :disabled="busy || loading || loadingMember" />
          <button type="submit" :disabled="busy || loading || loadingMember || !newMessage.trim()">Envoyer</button>
        </form>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { DEFAULT_PROFILE_PHOTO, useUserStore } from "../stores/userStore";
import { canRespondToRequest, canSendInConversation, conversationSection } from "../utils/messagePolicy";
import { getMessageMember, respondToMessageRequest, sendConversationMessage, sendMessageRequest, setUserBlocked, subscribeBlockedUsers, subscribeConversationMessages, subscribeConversations } from "../services/messageService";

const route = useRoute();
const router = useRouter();
const currentUid = useUserStore().user.uid;
const defaultPhoto = DEFAULT_PROFILE_PHOTO;
const tabs = [{ id: "conversations", label: "Conversations" }, { id: "requests", label: "Demandes" }, { id: "sent", label: "Envoyées" }];
const activeTab = ref("conversations");
const conversations = ref([]);
const members = ref({});
const blockedIds = ref([]);
const selectedMember = ref(null);
const selectedId = ref("");
const conversationMessages = ref([]);
const newMessage = ref("");
const errorMessage = ref("");
const loading = ref(true);
const loadingMember = ref(false);
const busy = ref(false);
let stopConversations;
let stopBlocked;
let stopMessages;
let memberRequest = 0;

const selectedConversation = computed(() => conversations.value.find(item => item.id === selectedId.value) || null);
const visibleConversations = computed(() => conversations.value.filter(item => conversationSection(item, currentUid) === activeTab.value));
const otherId = conversation => conversation.senderId === currentUid ? conversation.recipientId : conversation.senderId;
const tabCount = tab => conversations.value.filter(item => conversationSection(item, currentUid) === tab).length;

async function loadMember(uid) {
  if (!members.value[uid]) {
    const member = await getMessageMember(uid);
    members.value = { ...members.value, [uid]: member };
  }
  return members.value[uid];
}

function showError(error) {
  console.error("Messaging error", error);
  errorMessage.value = error.code === "permission-denied"
    ? "Envoi ou accès refusé. Vérifie les règles Firestore ou le blocage de ce membre."
    : error.message === "member-not-found" ? "Ce membre est introuvable." : "Impossible de charger ou d’envoyer le message. Réessaie.";
}

onMounted(() => {
  stopConversations = subscribeConversations(currentUid, items => {
    conversations.value = items;
    loading.value = false;
    items.forEach(item => loadMember(otherId(item)).catch(showError));
    if (selectedMember.value && !selectedId.value) {
      const existing = items.find(item => otherId(item) === selectedMember.value.id);
      if (existing) selectedId.value = existing.id;
    }
  }, error => { loading.value = false; showError(error); });
  stopBlocked = subscribeBlockedUsers(currentUid, ids => { blockedIds.value = ids; }, showError);
});

watch(() => route.query.to, async value => {
  const uid = typeof value === "string" ? value : "";
  if (!uid || uid === currentUid) return;
  const request = ++memberRequest;
  loadingMember.value = true;
  errorMessage.value = "";
  try {
    const member = await loadMember(uid);
    if (request !== memberRequest) return;
    selectedMember.value = member;
    selectedId.value = conversations.value.find(item => otherId(item) === uid)?.id || "";
  } catch (error) { if (request === memberRequest) showError(error); }
  finally { if (request === memberRequest) loadingMember.value = false; }
}, { immediate: true });

watch(selectedId, value => {
  stopMessages?.();
  conversationMessages.value = [];
  if (value) stopMessages = subscribeConversationMessages(value, messages => { conversationMessages.value = messages; }, showError);
});

function openConversation(conversation) {
  errorMessage.value = "";
  selectedId.value = conversation.id;
  selectedMember.value = members.value[otherId(conversation)] || { id: otherId(conversation), pseudo: "Membre" };
}

function closeConversation() {
  memberRequest += 1;
  selectedMember.value = null;
  selectedId.value = "";
  errorMessage.value = "";
  if (route.query.to) router.replace({ path: "/messages" });
}

async function send() {
  const text = newMessage.value.trim();
  if (!text || busy.value || loading.value || !selectedMember.value) return;
  busy.value = true;
  errorMessage.value = "";
  try {
    if (selectedConversation.value) {
      if (!canSendInConversation(selectedConversation.value, currentUid)) return;
      await sendConversationMessage(selectedConversation.value.id, currentUid, text);
    } else {
      selectedId.value = await sendMessageRequest(currentUid, selectedMember.value.id, text);
      activeTab.value = "sent";
    }
    newMessage.value = "";
  } catch (error) { showError(error); }
  finally { busy.value = false; }
}

async function respond(status) {
  if (!canRespondToRequest(selectedConversation.value, currentUid)) return;
  busy.value = true;
  errorMessage.value = "";
  try {
    await respondToMessageRequest(selectedConversation.value.id, status);
    activeTab.value = status === "accepted" ? "conversations" : "requests";
  } catch (error) { showError(error); }
  finally { busy.value = false; }
}

async function toggleBlock() {
  busy.value = true;
  errorMessage.value = "";
  try { await setUserBlocked(currentUid, selectedMember.value.id, !blockedIds.value.includes(selectedMember.value.id)); }
  catch (error) { showError(error); }
  finally { busy.value = false; }
}

onUnmounted(() => { memberRequest += 1; stopConversations?.(); stopBlocked?.(); stopMessages?.(); });
</script>

<style scoped>
.messages-page { width: 100%; color: #23332d; }
.page-heading { margin-bottom: 25px; }
.page-eyebrow { margin: 0 0 7px; color: #66836f; font-size: 10px; font-weight: 700; }
.page-heading h1 { margin: 0; color: #19382f; font: 600 30px/1.15 'Space Grotesk', sans-serif; }
.messenger { display: grid; min-height: 480px; grid-template-columns: minmax(200px, 280px) minmax(0, 1fr); overflow: hidden; border: 1px solid #e1e8e0; border-radius: 6px; background: #fff; }
.conversation-sidebar { padding: 20px; border-right: 1px solid #e6ebe5; }
.sidebar-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sidebar-heading h2 { margin: 0; color: #263c31; font: 600 15px 'Space Grotesk', sans-serif; }
.sidebar-heading span { color: #7d8b81; font-size: 11px; }
.conversation-sidebar p { margin: 22px 0 0; color: #7d8b81; font-size: 12px; line-height: 1.5; }
.message-tabs { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 20px; }
.message-tabs button { padding: 7px; border: 0; border-radius: 4px; background: transparent; color: #66776c; font-size: 10px; cursor: pointer; }
.message-tabs button.active { color: #19382f; background: #edf4e5; font-weight: 700; }
.conversation-item { display: flex; width: 100%; align-items: center; gap: 10px; padding: 12px 0; border: 0; border-bottom: 1px solid #edf0ec; color: #263c31; background: transparent; text-align: left; cursor: pointer; }
.conversation-item img, .chat-header img { width: 38px; height: 38px; flex: 0 0 38px; border-radius: 50%; object-fit: cover; }
.conversation-item span { display: grid; min-width: 0; gap: 4px; }
.conversation-item strong, .conversation-item small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conversation-item strong { font-size: 12px; }
.conversation-item small { color: #7d8b81; font-size: 10px; }
.chat-panel { display: flex; min-width: 0; min-height: 480px; flex-direction: column; }
.chat-header { display: flex; align-items: center; gap: 10px; padding: 14px; border-bottom: 1px solid #e6ebe5; }
.chat-header a { min-width: 0; flex: 1; overflow: hidden; color: #263c31; font-size: 13px; font-weight: 700; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
.back-button, .block-button { padding: 8px; border: 0; color: #64736a; background: transparent; font-size: 11px; cursor: pointer; }
.back-button { font-size: 20px; }
.block-button { color: #a64e43; }
.chat-messages { display: flex; flex: 1; flex-direction: column; align-items: flex-start; gap: 10px; padding: 18px; }
.message-bubble { max-width: 80%; padding: 10px 12px; border-radius: 6px; color: #263c31; background: #f0f3ef; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; white-space: pre-wrap; }
.message-bubble.own { align-self: flex-end; background: #e7f2d5; }
.chat-notice { color: #718078; font-size: 12px; line-height: 1.5; }
.chat-error { margin: 0; padding: 10px 14px; color: #a64e43; font-size: 12px; }
.action-notice { margin: 0; padding: 14px; border-top: 1px solid #e6ebe5; }
.request-actions, .chat-input { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #e6ebe5; }
.request-actions { justify-content: flex-end; }
.request-actions button, .chat-input button { padding: 9px 12px; border: 0; border-radius: 4px; color: #19382f; background: #edf4e5; font-size: 11px; font-weight: 700; cursor: pointer; }
.request-actions .primary, .chat-input button { background: #c9ef74; }
.chat-input input { min-width: 0; flex: 1; padding: 9px 12px; border: 1px solid #dfe6dc; border-radius: 4px; font: 13px 'DM Sans', sans-serif; }
.chat-input button:disabled, .request-actions button:disabled { opacity: .5; cursor: not-allowed; }
.messages-empty { display: grid; align-content: center; justify-items: center; gap: 12px; padding: 40px 20px; text-align: center; }
.empty-icon { display: grid; width: 52px; height: 52px; place-items: center; border-radius: 50%; color: #436e50; background: #edf4e5; }
.empty-icon svg { width: 25px; height: 25px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.6; }
.messages-empty h2 { margin: 0; color: #294033; font: 600 16px 'Space Grotesk', sans-serif; }
.messages-empty a { padding: 9px 13px; border-radius: 4px; color: #19382f; background: #c9ef74; font-size: 11px; font-weight: 700; text-decoration: none; }
.messages-empty a:hover { background: #bce55e; }
@media (max-width: 760px) {
  .page-heading h1 { font-size: 25px; }
  .messenger { min-height: 380px; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto 1fr; }
  .conversation-sidebar { padding: 16px; border-right: 0; border-bottom: 1px solid #e6ebe5; }
  .conversation-sidebar p { margin-top: 12px; }
  .messenger:has(.chat-panel) { display: block; }
  .sidebar-hidden { display: none; }
  .chat-panel { min-height: 380px; }
}
</style>