<template>
  <main class="social-page feed-page">
    <header class="page-heading">
      <div>
        <p class="page-eyebrow">TON CERCLE, EN DIRECT</p>
        <h1>Fil d’actualité</h1>
        <p class="page-description">Les nouvelles et les moments partagés par ta communauté.</p>
      </div>
      <div class="feed-header-actions">
        <button class="primary-action" type="button" @click="openPostModal">＋ <span>Créer une publication</span></button>
      </div>
    </header>

    <section class="feed-column" aria-label="Fil d’actualité">
      <button class="quick-composer" type="button" @click="openPostModal">
        <img :src="userPhoto" :alt="`Photo de ${userPseudo}`" />
        <span>Quoi de neuf, {{ userPseudo }} ?</span>
        <span class="composer-photo" aria-label="Ajouter une photo">▧</span>
      </button>

      <div class="feed-section-heading">
        <h2>Publications</h2>
        <span>{{ posts.length }}</span>
      </div>

      <div v-if="isLoading" class="empty-feed"><p>Chargement du fil…</p></div>
      <p v-else-if="feedError" class="feed-error" role="alert">{{ feedError }}</p>
      <div v-else-if="!posts.length" class="empty-feed">
        <span class="empty-mark" aria-hidden="true">✳</span>
        <h2>Ton fil est calme</h2>
        <p>Les publications des personnes que tu suis apparaîtront ici.</p>
        <RouterLink class="text-action" to="/recherche">Trouver des membres à suivre</RouterLink>
      </div>

      <article v-for="(post, postIndex) in posts" :key="post.id || postIndex" :ref="element => observePost(post, element)" class="post-card">
        <header class="post-header">
          <img :src="post.userPhoto || defaultPhoto" :alt="`Photo de ${post.user || userPseudo}`" class="post-pic" />
          <div class="post-author">
            <RouterLink :to="`/profil/${encodeURIComponent(post.authorId)}`">{{ post.authorName }}</RouterLink>
            <time :datetime="post.createdAt || undefined">{{ formatPostDate(post.createdAt) }}</time>
          </div>
          <span class="post-community-label">Communauté</span>
        </header>

        <p v-if="post.text" class="post-text">{{ post.text }}</p>
        <div v-if="post.mediaUrl" class="post-image-wrapper">
          <video v-if="post.mediaType === 'video'" :src="post.mediaUrl" class="post-image" controls preload="metadata"></video>
          <img v-else :src="post.mediaUrl" :alt="`Publication de ${post.authorName}`" class="post-image" />
        </div>

        <div class="post-actions">
          <button class="like-btn" :class="{ liked: post.liked }" type="button" :aria-pressed="post.liked" @click="toggleLike(post)">
            <span aria-hidden="true">{{ post.liked ? "♥" : "♡" }}</span>
            <span>{{ post.likeCount || 0 }} J’aime</span>
          </button>
          <span class="comment-count">{{ post.comments?.length || 0 }} commentaire{{ post.comments?.length === 1 ? '' : 's' }}</span>
        </div>

        <div class="comments-section">
          <div v-for="(comment, index) in post.comments || []" :key="comment.id || index" class="comment">
            <img :src="comment.authorPhoto || defaultPhoto" :alt="`Photo de ${comment.authorName}`" class="comment-pic" />
            <p><strong>{{ comment.authorName }}</strong> {{ comment.text }}</p>
          </div>
          <form class="add-comment" @submit.prevent="addComment(post)">
            <img :src="userPhoto" :alt="`Photo de ${userPseudo}`" class="comment-pic" />
            <input v-model="post.newComment" :aria-label="`Commenter la publication de ${post.user || userPseudo}`" type="text" placeholder="Écrire un commentaire…" />
            <button class="comment-btn" type="submit" :disabled="!post.newComment?.trim()">Envoyer</button>
          </form>
        </div>
      </article>
    </section>

    <div v-if="isModalOpen" class="modal-overlay" @click.self="closePostModal">
      <form class="modal" @submit.prevent="submitPost">
        <header class="modal-header"><h2>Créer une publication</h2><button class="modal-close" type="button" aria-label="Fermer" @click="closePostModal">×</button></header>
        <div class="composer-identity"><img :src="userPhoto" :alt="`Photo de ${userPseudo}`" /><strong>{{ userPseudo }}</strong></div>
        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
        <textarea v-model="postText" aria-label="Texte de la publication" placeholder="Qu’aimerais-tu partager ?"></textarea>
        <div v-if="mediaPreview" class="img-preview">
          <video v-if="selectedFile?.type.startsWith('video/')" :src="mediaPreview" controls></video>
          <img v-else :src="mediaPreview" alt="Aperçu de la photo" />
        </div>
        <div class="composer-tools">
          <label class="upload-label" for="file-input"><span aria-hidden="true">▧</span> Ajouter photo ou vidéo</label>
          <input id="file-input" type="file" accept="image/*,video/*" @change="handleMediaUpload" />
          <button class="publish-btn" type="submit" :disabled="isPublishing">{{ isPublishing ? "Publication…" : "Publier" }}</button>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { DEFAULT_PROFILE_PHOTO, useUserStore } from "../stores/userStore";
import {
  addPostComment,
  createPost,
  recordPostView,
  subscribeFeed,
  subscribePostComments,
  subscribePostLikes,
  togglePostLike,
} from "../services/socialService";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const defaultPhoto = DEFAULT_PROFILE_PHOTO;
const profile = userStore.getProfile();
const userPseudo = ref(profile.pseudo || "Utilisateur");
const userPhoto = ref(profile.photo || defaultPhoto);
const posts = ref([]);
const isLoading = ref(true);
const feedError = ref("");
const isModalOpen = ref(false);
const isPublishing = ref(false);
const postText = ref("");
const selectedFile = ref(null);
const mediaPreview = ref("");
const errorMessage = ref("");
const postSubscriptions = new Map();
let stopFeed = null;
let postViewObserver = null;
const viewedPostIds = new Set();

const observePost = (post, element) => {
  if (!element || !postViewObserver || viewedPostIds.has(post.id) || element.dataset.postId === post.id) return;
  element.dataset.postId = post.id;
  postViewObserver.observe(element);
};

const updatePost = (postId, changes) => {
  posts.value = posts.value.map(post => post.id === postId ? { ...post, ...changes } : post);
};

const stopPostSubscriptions = postId => {
  postSubscriptions.get(postId)?.forEach(unsubscribe => unsubscribe());
  postSubscriptions.delete(postId);
};

onMounted(() => {
  if ("IntersectionObserver" in window) {
    postViewObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const postId = entry.target.dataset.postId;
        if (!entry.isIntersecting || entry.intersectionRatio < 0.15 || viewedPostIds.has(postId)) return;
        const post = posts.value.find(item => item.id === postId);
        if (!post) return;
        viewedPostIds.add(postId);
        postViewObserver.unobserve(entry.target);
        recordPostView(post.id, userStore.user.uid, post.authorId).catch(error => {
          console.warn("Post view could not be recorded", error);
        });
      });
    }, { threshold: 0.15 });
  }

  if (route.query.compose === "1") {
    openPostModal();
    router.replace({ path: "/home" });
  }

  stopFeed = subscribeFeed(userStore.user.uid, feedPosts => {
    isLoading.value = false;
    feedError.value = "";
    const activeIds = new Set(feedPosts.map(post => post.id));
    for (const postId of postSubscriptions.keys()) if (!activeIds.has(postId)) stopPostSubscriptions(postId);
    posts.value = feedPosts.map(post => ({
      ...post,
      comments: posts.value.find(current => current.id === post.id)?.comments || [],
      likeCount: posts.value.find(current => current.id === post.id)?.likeCount || 0,
      liked: posts.value.find(current => current.id === post.id)?.liked || false,
      newComment: posts.value.find(current => current.id === post.id)?.newComment || "",
    }));

    feedPosts.forEach(post => {
      if (postSubscriptions.has(post.id)) return;
      const stopLikes = subscribePostLikes(post.id, userStore.user.uid, state => updatePost(post.id, {
        likeCount: state.count,
        liked: state.liked,
      }), handleFeedError);
      const stopComments = subscribePostComments(post.id, comments => updatePost(post.id, { comments }), handleFeedError);
      postSubscriptions.set(post.id, [stopLikes, stopComments]);
    });
  }, handleFeedError);
});

onUnmounted(() => {
  postViewObserver?.disconnect();
  stopFeed?.();
  postSubscriptions.forEach(unsubscribers => unsubscribers.forEach(unsubscribe => unsubscribe()));
  if (mediaPreview.value) URL.revokeObjectURL(mediaPreview.value);
});

function handleFeedError(error) {
  console.error("Feed Firebase error", error);
  isLoading.value = false;
  feedError.value = error.code === "permission-denied"
    ? "Active Firestore et déploie firestore.rules pour voir le fil."
    : "Le fil n’a pas pu être chargé. Vérifie la configuration Firestore.";
}

const openPostModal = () => { isModalOpen.value = true; errorMessage.value = ""; };

const closePostModal = () => {
  isModalOpen.value = false;
  postText.value = "";
  selectedFile.value = null;
  if (mediaPreview.value) URL.revokeObjectURL(mediaPreview.value);
  mediaPreview.value = "";
  errorMessage.value = "";
};

const handleMediaUpload = event => {
  const file = event.target.files?.[0];
  event.target.value = "";
  errorMessage.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    errorMessage.value = "Choisis une image ou une vidéo.";
    return;
  }
  const maxSize = file.type.startsWith("video/") ? 25 : 10;
  if (file.size > maxSize * 1024 * 1024) {
    errorMessage.value = `Le fichier doit faire ${maxSize} Mo maximum.`;
    return;
  }
  if (mediaPreview.value) URL.revokeObjectURL(mediaPreview.value);
  selectedFile.value = file;
  mediaPreview.value = URL.createObjectURL(file);
};

const submitPost = async () => {
  if ((!postText.value.trim() && !selectedFile.value) || isPublishing.value) {
    if (!postText.value.trim() && !selectedFile.value) errorMessage.value = "Ajoute un texte, une photo ou une vidéo.";
    return;
  }
  isPublishing.value = true;
  errorMessage.value = "";
  try {
    await createPost({ user: { ...userStore.user, ...userStore.getProfile() }, text: postText.value, file: selectedFile.value });
    closePostModal();
  } catch (error) {
    console.error("Publish Firebase error", error);
    errorMessage.value = error.message === "cloudinary-not-configured"
      ? "Les vidéos demandent Cloudinary (voir .env.local). Les photos fonctionnent sans."
      : error.code === "permission-denied"
        ? "Publie les règles de firestore.rules dans Firebase."
        : "Impossible de publier. Vérifie Firestore et Cloudinary puis réessaie.";
  } finally {
    isPublishing.value = false;
  }
};

const toggleLike = async post => {
  try {
    await togglePostLike(post.id, userStore.user.uid);
  } catch (error) {
    console.error("Like Firebase error", error);
    feedError.value = "Impossible d’enregistrer le J’aime. Vérifie les règles Firestore.";
  }
};

const addComment = async post => {
  const text = post.newComment?.trim();
  if (!text) return;
  updatePost(post.id, { newComment: "" });
  try {
    await addPostComment(post.id, { ...userStore.user, ...userStore.getProfile() }, text);
  } catch (error) {
    console.error("Comment Firebase error", error);
    updatePost(post.id, { newComment: text });
    feedError.value = "Impossible d’ajouter le commentaire. Vérifie les règles Firestore.";
  }
};

const formatPostDate = value => {
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime())
    ? "À l’instant"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
};
</script>




<style scoped>
.page-container {
  display: flex;
  font-family: 'Roboto', sans-serif;
}

.navbar {
  width: 200px;
  height: 100vh;
  background-color: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  position: fixed;
  top: 0;
  left: 0;
}

.title {
  font-size: 1.5rem;
  color: #fff;
  margin-bottom: 40px;
}

.nav-links {
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
  gap: 20px;
}

.nav-item {
  color: #fff;
  font-size: 1.5rem;
  text-align: center;
  width: 100%;
  padding: 5px 0;
  text-decoration: none;
}

.logout-btn {
  background: none;
  border: none;
  margin-top: 600px;
  cursor: pointer;
  padding: 15px;
}

.logout-btn svg {
  fill: white;
  width: 30px;
  height: 30px;
}

.content {
  margin-left: 200px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: calc(100% - 200px);
  box-sizing: border-box;
}

.posts-container {
  width: 500px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.post-card {
  background: #fff;
  padding: 15px;
  border-radius: 10px;
  width: 100%;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.post-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.post-pic {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
}

.post-user {
  font-weight: bold;
}

.post-text {
  margin-top: 10px;
  font-size: 1.1rem;
}

.post-image-wrapper {
  width: 100%;
  max-height: 400px;
  overflow: hidden;
  border-radius: 10px;
  margin-top: 10px;
}

.post-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-actions {
  margin-top: 10px;
}

.like-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.liked {
  color: #e0245e;
}

.comments-section {
  margin-top: 10px;
}

.comment {
  font-size: 0.9rem;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.comment-pic {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}

.add-comment {
  display: flex;
  gap: 5px;
  margin-top: 5px;
}

.add-comment input {
  flex: 1;
  padding: 8px 10px;
  font-size: 1rem;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.comment-btn {
  background: linear-gradient(135deg, #ff6ec7, #ff8e53);
  color: #fff;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  padding: 5px 12px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.comment-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: 400px;
  max-height: 90vh;
  background: white;
  padding: 20px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

textarea {
  width: 100%;
  height: 200px;
  padding: 10px;
  font-size: 1rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  resize: none;
  box-sizing: border-box;
}

.img-preview img {
  width: 100%;
  object-fit: cover;
  border-radius: 8px;
  margin-top: 5px;
}


.publish-btn {
  background: linear-gradient(135deg, #ff6ec7, #ff8e53);
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.publish-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}

.cancel-btn { 
  background: linear-gradient(135deg, #ccc, #999); 
  color: #000; 
  padding: 8px 16px; 
  border-radius: 8px; 
  border: none; 
  font-weight: bold; 
  cursor: pointer; 
  transition: all 0.3s ease; } 

.cancel-btn:hover { 
  transform: scale(1.05); 
  box-shadow: 0 5px 15px rgba(0,0,0,0.2); }

.error-message {
  color: red;
}

.floating-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 55px;
  height: 55px;
  border-radius: 50%;
  background: black;
  color: white;
  border: none;
  font-size: 2.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  transition: all 0.3s ease;
}

.floating-btn:hover {
  transform: scale(1.15);
  box-shadow: 0 8px 20px rgba(0,0,0,0.35);
}

.social-page { width: 100%; color: #23332d; }
.page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 25px; }
.page-eyebrow { margin: 0 0 7px; color: #66836f; font-size: 10px; font-weight: 700; }
.page-heading h1 { margin: 0; color: #19382f; font: 600 30px/1.15 'Space Grotesk', sans-serif; }
.page-description { margin: 8px 0 0; color: #77847d; font-size: 13px; }
.primary-action { display: flex; min-height: 42px; align-items: center; gap: 8px; padding: 0 14px; border: 0; border-radius: 5px; color: #19382f; background: #c9ef74; font-size: 12px; font-weight: 700; cursor: pointer; }
.primary-action:hover { background: #bce55e; }
.feed-column { display: grid; width: min(100%, 660px); gap: 14px; margin: 0 auto; }
.quick-composer { display: flex; min-height: 68px; align-items: center; gap: 12px; padding: 12px 15px; border: 1px solid #e4e9e3; border-radius: 7px; color: #78857e; background: #fff; text-align: left; cursor: pointer; }
.quick-composer img, .composer-identity img { width: 40px; height: 40px; flex: 0 0 40px; border-radius: 50%; object-fit: cover; }
.quick-composer > span:nth-child(2) { flex: 1; font-size: 13px; }
.composer-photo { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 50%; color: #4f7658; background: #edf4e5; font-size: 19px; }
.feed-section-heading { display: flex; align-items: center; gap: 9px; margin: 7px 2px 0; }
.feed-section-heading h2 { margin: 0; color: #34443c; font-size: 14px; }
.feed-section-heading span { display: grid; min-width: 22px; height: 22px; place-items: center; border-radius: 50%; color: #617267; background: #e8eee7; font-size: 10px; }
.empty-feed { display: grid; justify-items: center; padding: 42px 22px; border: 1px dashed #cbd6ca; border-radius: 7px; background: rgba(255,255,255,.55); text-align: center; }
.empty-mark { display: grid; width: 43px; height: 43px; place-items: center; border-radius: 50%; color: #45694d; background: #e8f2d9; font-size: 23px; }
.empty-feed h2 { margin: 15px 0 6px; color: #233b30; font: 600 17px 'Space Grotesk', sans-serif; }
.empty-feed p { max-width: 330px; margin: 0; color: #77847d; font-size: 12px; line-height: 1.6; }
.text-action { margin-top: 15px; padding: 8px 0; border: 0; color: #416247; background: none; font-size: 12px; font-weight: 700; cursor: pointer; }
.post-card { width: 100%; padding: 17px; border: 1px solid #e4e9e3; border-radius: 7px; background: #fff; box-shadow: none; }
.post-header { gap: 11px; }
.post-pic { width: 42px; height: 42px; flex: 0 0 42px; }
.post-author { display: grid; min-width: 0; flex: 1; gap: 4px; }
.post-author strong { overflow: hidden; color: #243a30; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.post-author time { color: #849087; font-size: 10px; }
.post-community-label { padding: 5px 8px; border-radius: 4px; color: #617267; background: #f1f5ef; font-size: 9px; }
.post-text { margin: 15px 0 12px; color: #34423a; font-size: 14px; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
.post-image-wrapper { max-height: 600px; margin-top: 10px; border-radius: 5px; background: #f0f3ef; }
.post-image { display: block; width: 100%; height: auto; max-height: 600px; object-fit: contain; }
.post-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding: 11px 0 4px; border-top: 1px solid #edf0ec; }
.like-btn { display: inline-flex; align-items: center; gap: 7px; padding: 5px 0; color: #64736a; font-size: 11px; }
.like-btn span:first-child { font-size: 19px; line-height: 1; }
.like-btn.liked { color: #bd5b54; }
.comment-count { color: #849087; font-size: 10px; }
.comments-section { display: grid; gap: 10px; }
.comment { align-items: flex-start; margin: 0; }
.comment-pic { flex: 0 0 30px; }
.comment p { margin: 0; color: #536159; font-size: 11px; line-height: 1.5; overflow-wrap: anywhere; }
.comment p strong { margin-right: 4px; color: #2f4538; }
.add-comment { align-items: center; gap: 9px; margin-top: 3px; }
.add-comment input { min-width: 0; height: 38px; border-color: #e4e9e3; background: #fafbf9; font-size: 11px; }
.comment-btn { flex: 0 0 auto; padding: 8px 11px; background: #edf4e5; color: #466348; font-size: 10px; }
.modal-overlay { z-index: 100; padding: 16px; }
.modal { width: min(100%, 540px); max-height: min(90svh, 720px); padding: 21px; border: 1px solid #e1e8df; border-radius: 8px; box-shadow: 0 22px 70px rgba(24,45,34,.2); }
.modal-header { display: flex; align-items: center; justify-content: space-between; }
.modal-header h2 { margin: 0; color: #19382f; font: 600 19px 'Space Grotesk', sans-serif; }
.modal-close { width: 30px; height: 30px; padding: 0; border: 0; border-radius: 50%; color: #637168; background: #f0f3ef; font-size: 21px; cursor: pointer; }
.composer-identity { display: flex; align-items: center; gap: 10px; color: #34463a; font-size: 12px; }
.modal textarea { height: 145px; border-color: #e3e8e2; font-size: 14px; }
.composer-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; border-top: 1px solid #edf0ec; }
.composer-tools input[type="file"] { display: none; }
.upload-label { color: #4f7658; font-size: 12px; font-weight: 600; cursor: pointer; }
.publish-btn { padding: 10px 18px; border-radius: 5px; color: #19382f; background: #c9ef74; font-size: 12px; }
.error-message { margin: 0; color: #a9463b; font-size: 12px; }

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
  .content { width: 100%; min-width: 0; margin: 0; padding: 82px 12px 90px; box-sizing: border-box; }
  .posts-container { width: 100%; max-width: 500px; }
  .modal { width: calc(100vw - 24px); box-sizing: border-box; }
  .page-heading { align-items: flex-start; margin-bottom: 18px; }
  .page-heading h1 { font-size: 25px; }
  .page-description { max-width: 260px; font-size: 11px; line-height: 1.5; }
  .primary-action { width: 40px; min-width: 40px; justify-content: center; padding: 0; font-size: 20px; }
  .primary-action span { display: none; }
  .quick-composer { min-height: 60px; padding: 10px; }
  .quick-composer img { width: 36px; height: 36px; flex-basis: 36px; }
  .feed-column { gap: 11px; }
  .post-card { padding: 13px; }
  .post-community-label { display: none; }
  .add-comment { flex-wrap: wrap; }
  .add-comment input { flex: 1 1 180px; }
}

@media (min-width: 701px) and (max-width: 900px) {
  .content { padding: 32px 24px; }
  .posts-container { width: min(100%, 500px); }
}
</style>


