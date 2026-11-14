<template>
  <main class="social-page profile-page">
    <header class="profile-cover">
      <div class="cover-art"><span>TON ESPACE</span></div>
      <section class="profile-summary">
        <img class="profile-avatar" :src="profile.photo || defaultPhoto" :alt="`Photo de ${profile.pseudo}`" />
        <div class="profile-identity">
          <p class="page-eyebrow">{{ isOwnProfile ? "MON PROFIL" : "PROFIL COMMUNAUTAIRE" }}</p>
          <h1>{{ profile.pseudo }}</h1>
          <p class="profile-bio">{{ profile.bio || "Ajoute une bio pour te présenter à ta communauté." }}</p>
          <div class="profile-social-stats">
            <span><strong>{{ mediaItems.length }}</strong> publications</span>
            <span><strong>{{ followCounts.followers }}</strong> abonnés</span>
            <span><strong>{{ followCounts.following }}</strong> suivis</span>
          </div>
        </div>
        <RouterLink v-if="isOwnProfile" class="edit-profile-action" to="/modifier-profil">Modifier le profil</RouterLink>
        <button v-else class="add-media-action" type="button" :class="{ following: isFollowing(displayedAccountId) }" @click="toggleFollow(displayedAccountId)">
          {{ isFollowing(displayedAccountId) ? "Abonné" : "Suivre" }}
        </button>
        <RouterLink v-if="!isOwnProfile" class="edit-profile-action" :to="{ path: '/messages', query: { to: displayedAccountId } }">Message</RouterLink>
      </section>
    </header>

    <section class="profile-publications">
      <header class="profile-section-heading">
        <div><p class="page-eyebrow">{{ isOwnProfile ? "TES PUBLICATIONS" : `PUBLICATIONS DE ${profile.pseudo.toUpperCase()}` }}</p><h2>Photos et vidéos <span>{{ mediaItems.length }}</span></h2></div>
        <button v-if="isOwnProfile" class="add-media-action" type="button" :disabled="isUploading" @click="fileInput?.click()">{{ isUploading ? "Envoi…" : "＋ Ajouter une publication" }}</button>
      </header>

      <input v-if="isOwnProfile" ref="fileInput" class="media-input" type="file" accept="image/*,video/*" @change="handleMediaUpload" />
      <p v-if="mediaError" class="media-error" role="alert">{{ mediaError }}</p>
      <div v-if="mediaLoading" class="profile-empty"><p>Chargement des publications…</p></div>

      <div v-else-if="!mediaItems.length" class="profile-empty">
        <span class="empty-mark" aria-hidden="true">▧</span>
        <h3>{{ !isOwnProfile && profile.profilePublic === false && !following ? "Profil privé" : "Aucune publication pour le moment" }}</h3>
        <p>{{ !isOwnProfile && profile.profilePublic === false && !following ? "Suis ce membre pour voir ses publications." : isOwnProfile ? "Ajoute ici tes photos et vidéos préférées." : "Ce membre n’a pas encore publié de photo ou de vidéo." }}</p>
      </div>

      <div v-else class="profile-media-grid">
        <button v-for="item in mediaItems" :key="item.id" class="media-tile" type="button" :aria-label="`Ouvrir le ${item.type === 'video' ? 'vidéo' : 'photo'} du ${formatMediaDate(item.createdAt)}`" @click="selectMedia(item)">
          <img v-if="item.type === 'image'" :src="item.mediaUrl" alt="Photo de la galerie" />
          <video v-else :src="item.mediaUrl" muted playsinline preload="metadata"></video>
          <span v-if="item.type === 'video'" class="video-indicator" aria-label="Vidéo">▶</span>
          <span v-if="isOwnProfile" class="view-count" :aria-label="`${item.viewCount || 0} vues`" title="Vues">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            {{ item.viewCount || 0 }}
          </span>
        </button>
      </div>
    </section>

    <section v-if="isOwnProfile && otherMembers.length" class="community-section">
      <header class="profile-section-heading">
        <div><p class="page-eyebrow">FAIRE GRANDIR TON CERCLE</p><h2>Membres <span>{{ otherMembers.length }}</span></h2></div>
      </header>
      <div class="community-list">
        <article v-for="member in otherMembers" :key="member.id" class="community-member">
          <RouterLink class="community-member-profile" :to="`/profil/${encodeURIComponent(member.id)}`">
            <img :src="member.photo || defaultPhoto" :alt="`Photo de ${member.pseudo}`" />
            <div><strong>{{ member.pseudo }}</strong><span>{{ member.bio || "Membre de la communauté" }}</span></div>
          </RouterLink>
          <button type="button" :class="{ following: isFollowing(member.id) }" @click="toggleFollow(member.id)">
            {{ isFollowing(member.id) ? "Abonné" : "Suivre" }}
          </button>
        </article>
      </div>
    </section>

    <div v-if="selectedMedia" class="media-viewer" role="dialog" aria-modal="true" aria-label="Aperçu de la publication" @click.self="selectedMedia = null">
      <div class="media-viewer-panel">
        <button class="media-viewer-close" type="button" aria-label="Fermer l’aperçu" @click="selectedMedia = null">×</button>
        <div class="viewer-media">
          <img v-if="selectedMedia.type === 'image'" :src="selectedMedia.mediaUrl" alt="Photo agrandie" />
          <video v-else :src="selectedMedia.mediaUrl" controls autoplay playsinline></video>
        </div>
        <aside class="viewer-details">
          <header class="viewer-author">
            <img :src="selectedMedia.authorPhoto || defaultPhoto" :alt="`Photo de ${selectedMedia.authorName}`" />
            <div><strong>{{ selectedMedia.authorName || profile.pseudo }}</strong><span>{{ formatMediaDate(selectedMedia.createdAt) }}</span></div>
          </header>
          <div class="viewer-comments">
            <p v-if="!selectedMedia.comments?.length" class="no-comments">Pas encore de commentaire. Lance la conversation.</p>
            <article v-for="comment in selectedMedia.comments || []" :key="comment.id" class="viewer-comment">
              <img :src="comment.authorPhoto || defaultPhoto" :alt="`Photo de ${comment.authorName}`" />
              <p><strong>{{ comment.authorName }}</strong> {{ comment.text }}</p>
            </article>
          </div>
          <div class="viewer-actions">
            <button type="button" class="media-like" :class="{ liked: selectedMedia.liked }" :aria-pressed="selectedMedia.liked" @click="toggleMediaLike(selectedMedia)">
              <span aria-hidden="true">{{ isMediaLiked(selectedMedia) ? "♥" : "♡" }}</span>
              {{ selectedMedia.likeCount || 0 }} J’aime
            </button>
            <form class="media-comment-form" @submit.prevent="submitMediaComment">
              <input v-model="newMediaComment" type="text" aria-label="Écrire un commentaire" placeholder="Ajouter un commentaire…" maxlength="300" />
              <button type="submit" :disabled="!newMediaComment.trim()">Envoyer</button>
            </form>
            <button v-if="isOwnProfile && selectedMedia.authorId === currentUid" class="delete-media" type="button" @click="removeMedia(selectedMedia)">Supprimer cette publication</button>
          </div>
        </aside>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { DEFAULT_PROFILE_PHOTO, useUserStore } from "../stores/userStore";
import { canViewProfilePosts } from "../utils/profileVisibility";
import {
  addPostComment,
  createPost,
  deletePost,
  subscribeFollowCounts,
  subscribeFollowState,
  subscribeMembers,
  subscribePostComments,
  subscribePostLikes,
  subscribePostViews,
  recordPostView,
  subscribeUserPosts,
  subscribeUserProfile,
  toggleFollow as toggleRemoteFollow,
  togglePostLike,
} from "../services/socialService";

const userStore = useUserStore();
const route = useRoute();
const currentUser = userStore.user;
const currentUid = currentUser.uid;
const defaultPhoto = DEFAULT_PROFILE_PHOTO;
const fileInput = ref(null);
const profile = ref(userStore.getProfile());
const mediaItems = ref([]);
const selectedMedia = ref(null);
const mediaError = ref("");
const newMediaComment = ref("");
const followCounts = ref({ followers: 0, following: 0 });
const following = ref(false);
const otherMembers = ref([]);
const mediaLoading = ref(true);
const isUploading = ref(false);
const displayedAccountId = computed(() => String(route.params.memberId || currentUid));
const isOwnProfile = computed(() => displayedAccountId.value === currentUid);

let profileUnsubscribe;
let postsUnsubscribe;
let countsUnsubscribe;
let followUnsubscribe;
let membersUnsubscribe;
let selectedLikesUnsubscribe;
let selectedCommentsUnsubscribe;
const viewSubscriptions = new Map();

const stopViewSubscriptions = () => {
  viewSubscriptions.forEach(unsubscribe => unsubscribe());
  viewSubscriptions.clear();
};

function handleCloudError(error) {
  console.error("Firebase profil error", error);
  mediaError.value = error.message === "cloudinary-not-configured"
    ? "Les vidéos demandent Cloudinary (voir .env.local). Les photos fonctionnent sans."
    : error.code === "permission-denied"
    ? "Accès refusé par Firestore. Vérifie ta connexion et les règles de sécurité."
    : "Les données du profil n’ont pas pu être chargées. Vérifie la configuration Firebase.";
}

const updateMedia = (mediaId, changes) => {
  mediaItems.value = mediaItems.value.map(item => item.id === mediaId ? { ...item, ...changes } : item);
  if (selectedMedia.value?.id === mediaId) selectedMedia.value = { ...selectedMedia.value, ...changes };
};

watch(displayedAccountId, (uid, previousUid, onCleanup) => {
  profileUnsubscribe?.();
  postsUnsubscribe?.();
  countsUnsubscribe?.();
  followUnsubscribe?.();
  selectedLikesUnsubscribe?.();
  selectedCommentsUnsubscribe?.();
  stopViewSubscriptions();
  selectedMedia.value = null;
  mediaItems.value = [];
  mediaLoading.value = true;
  mediaError.value = "";
  following.value = false;
  let profileReady = false;
  let followReady = uid === currentUid;

  profileUnsubscribe = subscribeUserProfile(uid, result => {
    if (result) {
      profile.value = result;
      profileReady = true;
      loadPosts();
    } else {
      mediaError.value = "Ce profil est introuvable.";
      mediaLoading.value = false;
    }
  }, error => {
    mediaLoading.value = false;
    handleCloudError(error);
  });

  const loadPosts = () => {
    if (!profileReady || !followReady) return;
    postsUnsubscribe?.();
    postsUnsubscribe = null;
    mediaItems.value = [];
    if (!canViewProfilePosts({ isOwnProfile: uid === currentUid, profilePublic: profile.value.profilePublic, following: following.value })) {
      selectedMedia.value = null;
      selectedLikesUnsubscribe?.();
      selectedCommentsUnsubscribe?.();
      mediaLoading.value = false;
      return;
    }
    mediaLoading.value = true;
    postsUnsubscribe = subscribeUserPosts(uid, posts => {
      mediaItems.value = posts.filter(post => post.mediaUrl && post.surface !== "feed").map(post => ({
        ...post,
        type: post.mediaType || "image",
        viewCount: mediaItems.value.find(item => item.id === post.id)?.viewCount || 0,
        likeCount: 0,
        liked: false,
        comments: [],
      }));
      const activePostIds = new Set(mediaItems.value.map(item => item.id));
      for (const [postId, unsubscribe] of viewSubscriptions) {
        if (activePostIds.has(postId)) continue;
        unsubscribe();
        viewSubscriptions.delete(postId);
      }
      if (isOwnProfile.value) {
        mediaItems.value.forEach(item => {
          if (viewSubscriptions.has(item.id)) return;
          viewSubscriptions.set(item.id, subscribePostViews(item.id, viewCount => {
            updateMedia(item.id, { viewCount });
          }, handleCloudError));
        });
      }
      mediaLoading.value = false;
    }, error => {
      mediaLoading.value = false;
      handleCloudError(error);
    });
  };

  countsUnsubscribe = subscribeFollowCounts(uid, (kind, count) => {
    followCounts.value = { ...followCounts.value, [kind]: count };
  }, handleCloudError);

  if (!isOwnProfile.value) {
    followUnsubscribe = subscribeFollowState(currentUid, uid, value => {
      following.value = value;
      followReady = true;
      loadPosts();
    }, error => {
      mediaLoading.value = false;
      handleCloudError(error);
    });
  } else {
    followReady = true;
  }

  onCleanup(() => {
    profileUnsubscribe?.();
    postsUnsubscribe?.();
    countsUnsubscribe?.();
    followUnsubscribe?.();
    selectedLikesUnsubscribe?.();
    selectedCommentsUnsubscribe?.();
  });
}, { immediate: true });

membersUnsubscribe = subscribeMembers(members => {
  otherMembers.value = members.filter(member => member.id !== currentUid);
}, handleCloudError);

onUnmounted(() => {
  profileUnsubscribe?.();
  postsUnsubscribe?.();
  countsUnsubscribe?.();
  followUnsubscribe?.();
  membersUnsubscribe?.();
  selectedLikesUnsubscribe?.();
  selectedCommentsUnsubscribe?.();
  stopViewSubscriptions();
});

const formatMediaDate = value => {
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "À l’instant" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
};

const handleMediaUpload = async event => {
  const file = event.target.files?.[0];
  event.target.value = "";
  mediaError.value = "";
  if (!file || !isOwnProfile.value) return;
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    mediaError.value = "Choisis une image ou une vidéo.";
    return;
  }
  if (file.size > 25 * 1024 * 1024) {
    mediaError.value = "La photo ou vidéo doit faire 25 Mo maximum.";
    return;
  }
  isUploading.value = true;
  try {
    await createPost({ user: { ...currentUser, ...profile.value }, text: "", file, surface: "profile" });
  } catch (error) {
    handleCloudError(error);
  } finally {
    isUploading.value = false;
  }
};

const isMediaLiked = media => Boolean(media.liked);

const selectMedia = media => {
  selectedLikesUnsubscribe?.();
  selectedCommentsUnsubscribe?.();
  selectedMedia.value = media;
  recordPostView(media.id, currentUid, media.authorId).catch(handleCloudError);
  selectedLikesUnsubscribe = subscribePostLikes(media.id, currentUid, state => updateMedia(media.id, state), handleCloudError);
  selectedCommentsUnsubscribe = subscribePostComments(media.id, comments => updateMedia(media.id, { comments }), handleCloudError);
};

const toggleMediaLike = async media => {
  try {
    await togglePostLike(media.id, currentUid);
  } catch (error) {
    handleCloudError(error);
  }
};

const submitMediaComment = async () => {
  const text = newMediaComment.value.trim();
  if (!text || !selectedMedia.value) return;
  newMediaComment.value = "";
  try {
    await addPostComment(selectedMedia.value.id, { ...currentUser, ...userStore.getProfile() }, text);
  } catch (error) {
    newMediaComment.value = text;
    handleCloudError(error);
  }
};

const isFollowing = memberId => memberId === displayedAccountId.value && following.value;

const toggleFollow = async memberId => {
  try {
    await toggleRemoteFollow(currentUid, memberId);
  } catch (error) {
    handleCloudError(error);
  }
};

const removeMedia = async item => {
  if (!isOwnProfile.value || item.authorId !== currentUid) return;
  try {
    await deletePost(item);
    selectedMedia.value = null;
  } catch (error) {
    handleCloudError(error);
  }
};
</script>

<style scoped>
.profile-cover { overflow: hidden; border: 1px solid #e3e9e1; border-radius: 7px; background: #fff; }
.cover-art { display: flex; height: 118px; align-items: flex-start; justify-content: flex-end; padding: 18px; color: rgba(255,255,255,.82); background-color: #315d49; background-image: linear-gradient(135deg, transparent 49.5%, rgba(255,255,255,.06) 50%, transparent 50.5%), linear-gradient(45deg, transparent 49.5%, rgba(255,255,255,.05) 50%, transparent 50.5%); background-size: 30px 30px; }
.cover-art span { font-size: 9px; font-weight: 700; }
.profile-summary { display: flex; align-items: center; gap: 20px; padding: 0 24px 23px; }
.profile-avatar { width: 92px; height: 92px; flex: 0 0 92px; margin-top: -35px; border: 4px solid #fff; border-radius: 50%; background: #e8eee8; object-fit: cover; }
.profile-identity { min-width: 0; flex: 1; padding-top: 12px; }
.profile-identity .page-eyebrow, .profile-section-heading .page-eyebrow { margin: 0 0 5px; color: #69836f; font-size: 9px; font-weight: 700; }
.profile-identity h1 { margin: 0; color: #19382f; font: 600 23px/1.2 'Space Grotesk', sans-serif; overflow-wrap: anywhere; }
.profile-bio { margin: 12px 0 0; color: #526158; font-size: 12px; line-height: 1.6; white-space: pre-line; overflow-wrap: anywhere; }
.profile-social-stats { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; color: #78857d; font-size: 10px; }
.profile-social-stats strong { margin-right: 3px; color: #2f4538; font-size: 12px; }
.edit-profile-action, .profile-empty-action { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; padding: 0 12px; border: 1px solid #dfe6dc; border-radius: 5px; color: #405c47; background: #fff; font-size: 11px; font-weight: 700; text-decoration: none; white-space: nowrap; }
.edit-profile-action:hover, .profile-empty-action:hover { background: #f3f6f1; }
.profile-publications { margin-top: 27px; }
.profile-section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; margin-bottom: 14px; }
.profile-section-heading h2 { display: flex; align-items: center; gap: 8px; margin: 0; color: #263c31; font: 600 18px 'Space Grotesk', sans-serif; }
.profile-section-heading h2 span { color: #869289; font: 500 11px 'DM Sans', sans-serif; }
.add-media-action { min-height: 36px; padding: 0 12px; border: 0; border-radius: 5px; color: #19382f; background: #c9ef74; font-size: 11px; font-weight: 700; cursor: pointer; }
.add-media-action:hover { background: #bce55e; }
.add-media-action.following { border: 1px solid #dfe6dc; color: #526158; background: #fff; }
.media-input { display: none; }
.media-error { margin: 0 0 12px; color: #a9463b; font-size: 11px; }
.profile-empty { display: grid; min-height: 230px; justify-items: center; align-content: center; padding: 24px; border: 1px dashed #cbd6ca; border-radius: 7px; background: rgba(255,255,255,.55); text-align: center; }
.profile-empty h3 { margin: 12px 0 5px; color: #294033; font: 600 16px 'Space Grotesk', sans-serif; }
.profile-empty p { max-width: 320px; margin: 0 0 14px; color: #78857d; font-size: 11px; line-height: 1.6; }
.profile-media-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.media-tile { position: relative; display: block; min-width: 0; overflow: hidden; aspect-ratio: 1; padding: 0; border: 0; border-radius: 5px; background: #e7ece6; cursor: pointer; }
.media-tile img, .media-tile video { display: block; width: 100%; height: 100%; object-fit: cover; }
.media-tile:hover img, .media-tile:hover video { transform: scale(1.025); }
.media-tile img, .media-tile video { transition: transform .2s ease; }
.view-count { position: absolute; bottom: 9px; left: 9px; display: inline-flex; align-items: center; gap: 5px; color: #fff; font-size: 11px; font-weight: 700; text-shadow: 0 1px 4px rgba(0,0,0,.9); }
.view-count svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; filter: drop-shadow(0 1px 2px rgba(0,0,0,.9)); }
.video-indicator { position: absolute; right: 9px; bottom: 9px; display: grid; width: 27px; height: 27px; place-items: center; border: 1px solid rgba(255,255,255,.72); border-radius: 50%; color: #fff; background: rgba(20,35,27,.68); font-size: 10px; }
.media-viewer { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 18px; background: rgba(17,29,23,.82); }
.media-viewer-panel { position: relative; display: grid; width: min(100%, 1120px); height: min(82svh, 760px); grid-template-columns: minmax(0, 1fr) 330px; overflow: hidden; border-radius: 7px; background: #fff; }
.viewer-media { display: grid; min-width: 0; min-height: 0; place-items: center; background: #101411; }
.viewer-media > img, .viewer-media > video { display: block; width: 100%; height: 100%; max-height: 82svh; object-fit: contain; }
.viewer-details { display: flex; min-width: 0; flex-direction: column; background: #fff; }
.viewer-author { display: flex; min-height: 63px; align-items: center; gap: 10px; padding: 0 14px; border-bottom: 1px solid #e8ede7; }
.viewer-author img, .viewer-comment img { width: 34px; height: 34px; flex: 0 0 34px; border-radius: 50%; object-fit: cover; }
.viewer-author div { display: grid; gap: 4px; }
.viewer-author strong { color: #2d4035; font-size: 11px; }
.viewer-author span { color: #859087; font-size: 9px; }
.viewer-comments { display: grid; flex: 1; align-content: start; gap: 12px; overflow: auto; padding: 14px; }
.no-comments { margin: 0; color: #829087; font-size: 10px; line-height: 1.6; }
.viewer-comment { display: flex; align-items: flex-start; gap: 8px; }
.viewer-comment img { width: 28px; height: 28px; flex-basis: 28px; }
.viewer-comment p { margin: 2px 0 0; color: #536159; font-size: 10px; line-height: 1.5; overflow-wrap: anywhere; }
.viewer-comment strong { margin-right: 3px; color: #2f4538; }
.viewer-actions { padding: 11px 13px 13px; border-top: 1px solid #e8ede7; }
.media-like { display: flex; align-items: center; gap: 7px; padding: 2px 0 11px; border: 0; color: #56655c; background: none; font-size: 11px; cursor: pointer; }
.media-like span { font-size: 20px; }
.media-like.liked { color: #c05258; }
.media-comment-form { display: flex; align-items: center; gap: 7px; }
.media-comment-form input { width: 0; min-width: 0; height: 35px; flex: 1; padding: 0 9px; border: 1px solid #e1e8df; border-radius: 4px; outline: none; font: 10px 'DM Sans', sans-serif; }
.media-comment-form input:focus { border-color: #9ab78a; }
.media-comment-form button { padding: 8px 9px; border: 0; border-radius: 4px; color: #35523d; background: #edf4e5; font-size: 9px; font-weight: 700; cursor: pointer; }
.media-comment-form button:disabled { opacity: .5; cursor: not-allowed; }
.delete-media { margin-top: 10px; padding: 0; border: 0; color: #a44c43; background: none; font-size: 9px; cursor: pointer; }
.media-viewer-close { position: absolute; top: 10px; right: 10px; z-index: 2; width: 34px; height: 34px; border: 1px solid rgba(255,255,255,.5); border-radius: 50%; color: #fff; background: rgba(17,29,23,.65); font-size: 22px; cursor: pointer; }
.community-section { margin-top: 28px; }
.community-list { display: grid; max-width: 680px; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.community-member { display: flex; min-width: 0; flex-direction: column; align-items: stretch; gap: 12px; padding: 14px; border: 1px solid #e4e9e3; border-radius: 5px; background: #fff; }
.community-member-profile img { width: 44px; height: 44px; flex: 0 0 44px; border-radius: 50%; object-fit: cover; }
.community-member-profile { display: flex; min-width: 0; flex: 1; align-items: center; gap: 9px; color: inherit; text-decoration: none; }
.community-member-profile:hover strong { text-decoration: underline; }
.community-member-profile > div { display: grid; min-width: 0; flex: 1; gap: 4px; }
.community-member strong { overflow: hidden; color: #2f4538; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.community-member span { overflow: hidden; color: #849087; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.community-member button { width: 100%; min-height: 34px; padding: 0 8px; border: 0; border-radius: 4px; color: #19382f; background: #c9ef74; font-size: 10px; font-weight: 700; cursor: pointer; }
.community-member button.following { border: 1px solid #dfe6dc; color: #526158; background: #fff; }

@media (max-width: 700px) {
  .profile-summary { align-items: flex-start; flex-wrap: wrap; gap: 12px; padding: 0 14px 17px; }
  .profile-avatar { width: 74px; height: 74px; flex-basis: 74px; margin-top: -28px; }
  .profile-identity { flex: 1 1 calc(100% - 90px); padding-top: 6px; }
  .profile-identity h1 { font-size: 20px; }
  .profile-bio { margin-top: 8px; }
  .profile-social-stats { gap: 11px; margin-top: 9px; font-size: 9px; }
  .edit-profile-action { margin-left: auto; }
  .profile-section-heading { align-items: flex-start; }
  .profile-section-heading h2 { font-size: 16px; }
  .profile-section-heading { align-items: center; }
  .profile-section-heading h2 { font-size: 15px; }
  .add-media-action { min-height: 34px; padding: 0 9px; font-size: 9px; white-space: nowrap; }
  .profile-media-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
  .media-viewer { padding: 8px; }
  .media-viewer-panel { width: 100%; height: min(90svh, 760px); grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) minmax(210px, 36%); }
  .viewer-media > img, .viewer-media > video { max-height: 55svh; }
  .viewer-details { min-height: 0; }
  .viewer-comments { padding: 10px 12px; }
  .community-list { grid-template-columns: minmax(0, 1fr); }
}

@media (min-width: 701px) and (max-width: 1100px) {
  .profile-summary { padding-inline: 18px; }
}

</style>
