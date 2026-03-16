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
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 24 24">
          <path d="M10 17v-3H3v-4h7V7l5 5-5 5zM20 3h-8v2h8v14h-8v2h8c1.1 0 2-0.9 2-2V5c0-1.1-0.9-2-2-2z"/>
        </svg>
      </button>
    </nav>

    <!-- Contenu -->
    <div class="content">
      <!-- Profile header -->
      <div class="profile-header">
        <img class="profile-pic" :src="userPhoto || defaultPhoto" alt="">
        <div class="user-info">
          <h1>{{ userPseudo || "Pseudo" }}</h1>
          <div class="stats">
            <div class="stat-item">
              <strong>{{ posts.length }}</strong>
              <span>Publications</span>
            </div>
            <div class="stat-item">
              <strong>{{ followers }}</strong>
              <span>Abonnés</span>
            </div>
            <div class="stat-item">
              <strong>{{ following }}</strong>
              <span>Suivis</span>
            </div>
          </div>
          <p class="user-bio">{{ userBio || 'Aucune bio renseignée pour le moment.' }}</p>
          <button class="edit-btn" @click="goToModifierProfil">Modifier le profil</button>
        </div>
      </div>

      <!-- Galerie -->
      <div class="underline-wrapper">
        <div class="underline"></div>
        <div class="posts-gallery">
          <div v-for="(post, index) in posts" :key="index" class="post-container">
            <img :src="post" class="post-image" @click="openModal(index)" />
          </div>
        </div>
      </div>

      <input type="file" ref="postInput" accept="image/*" @change="handlePostFileChange" style="display:none;">
    </div>

    <div class="add-post-container">
      <button class="add-post-btn" @click="triggerPostInput">+</button>
    </div>

    <!-- Modal -->
    <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-left">
          <img :src="posts[modalIndex]" class="modal-image" />
        </div>
        <div class="modal-right">
          <div class="comments-header">
            <h3>Commentaires</h3>

            <!-- Bouton 3 points -->
            <button class="menu-btn" @click="toggleOptionsMenu">
              <svg xmlns="http://www.w3.org/2000/svg" class="menu-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12h.01M12 12h.01M18 12h.01"/>
              </svg>
            </button>

            <!-- Menu déroulant -->
            <div v-if="optionsMenuOpen" class="options-menu">
              <button @click="deletePost(modalIndex)" class="menu-item delete">Supprimer</button>
              <button @click="closeOptionsMenu" class="menu-item cancel">Annuler</button>
            </div>
          </div>

          <div class="comments-list">
            <div v-for="(comment, idx) in comments[modalIndex] || []" :key="idx" class="comment">
              <div class="comment-top">
                <img class="comment-avatar" :src="userPhoto || defaultPhoto" />
                <strong class="comment-pseudo">{{ userPseudo || 'Pseudo' }}</strong>
              </div>
              <div class="comment-text">{{ comment }}</div>
            </div>
          </div>

          <div class="add-comment">
            <textarea v-model="newComment" placeholder="Ajouter un commentaire..."></textarea>
            <button @click="addComment(modalIndex)" class="send-btn">
              <svg xmlns="http://www.w3.org/2000/svg" class="send-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10l9-9m0 0l9 9m-9-9v18"/>
              </svg>
            </button>
          </div>

          <div class="post-actions">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              class="icon heart" :class="{ liked: isLiked }" @click="toggleLike">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.364l-7.682-7.682a4.5 4.5 0 010-6.364z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

export default {
  name: "Profil",
  setup() {
    const router = useRouter();

    const userPseudo = ref(localStorage.getItem("userPseudo") || "");
    const userPhoto = ref(localStorage.getItem("userPhoto") || null);
    const userBio = ref(localStorage.getItem("userBio") || "");
    const userGender = ref(localStorage.getItem("userGender") || "");
    const postInput = ref(null);
    const defaultPhoto = "https://via.placeholder.com/150";
    const followers = ref(parseInt(localStorage.getItem("userFollowers") || "0"));
    const following = ref(parseInt(localStorage.getItem("userFollowing") || "0"));

    const posts = ref([]);
    const comments = ref([]);
    const newComment = ref("");

    const modalOpen = ref(false);
    const modalIndex = ref(0);
    const isLiked = ref(false);
    const optionsMenuOpen = ref(false);

    onMounted(() => {
      posts.value = JSON.parse(localStorage.getItem("userPosts") || "[]");
      comments.value = JSON.parse(localStorage.getItem("userComments") || "[]");
      isLiked.value = JSON.parse(localStorage.getItem("isLiked") || "false");
    });

    const handleLogout = () => {
      localStorage.setItem("userPseudo", userPseudo.value);
      localStorage.setItem("userBio", userBio.value);
      localStorage.setItem("userPhoto", userPhoto.value);
      localStorage.removeItem("authToken");
      router.push("/login");
    };

    const goToModifierProfil = () => {
      router.push("/modifier-profil");
    };

    const triggerPostInput = () => postInput.value.click();

const handlePostFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (event) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      let width = img.width;
      let height = img.height;

      // ✅ Seulement si l’image est vraiment énorme
      const maxSize = 2500;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = width * ratio;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      // ✅ Compression très haute qualité (quasi aucune perte)
      const finalImage = canvas.toDataURL("image/jpeg", 0.98);

      // ✅ Ajout du post (stable)
      posts.value.push(finalImage);

      // ✅ Sauvegarde
      localStorage.setItem("userPosts", JSON.stringify(posts.value));
    };

    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
};


    const openModal = index => {
      modalIndex.value = index;
      modalOpen.value = true;
    };

    const closeModal = () => modalOpen.value = false;

    const toggleOptionsMenu = () => {
      optionsMenuOpen.value = !optionsMenuOpen.value;
    };

    const closeOptionsMenu = () => {
      optionsMenuOpen.value = false;
    };

    const deletePost = (index) => {
      if (confirm("Voulez-vous vraiment supprimer cette publication ?")) {
        posts.value.splice(index, 1);
        localStorage.setItem("userPosts", JSON.stringify(posts.value));
        closeModal();
      }
      closeOptionsMenu();
    };

    const addComment = index => {
      if (!newComment.value.trim()) return;
      if (!comments.value[index]) comments.value[index] = [];
      comments.value[index].push(newComment.value);
      newComment.value = "";
      localStorage.setItem("userComments", JSON.stringify(comments.value));
    };

    const toggleLike = () => {
      isLiked.value = !isLiked.value;
      localStorage.setItem("isLiked", JSON.stringify(isLiked.value));
    };

    return {
      userPseudo,
      userPhoto,
      userBio,
      defaultPhoto,
      postInput,
      posts,
      comments,
      newComment,
      modalOpen,
      modalIndex,
      handleLogout,
      triggerPostInput,
      handlePostFileChange,
      openModal,
      closeModal,
      addComment,
      isLiked,
      toggleLike,
      goToModifierProfil,
      followers,
      following,
      toggleOptionsMenu,
      closeOptionsMenu,
      optionsMenuOpen,
      deletePost
    };
  }
};
</script>




<style scoped>
.page-container {
  display: flex;
}

/* Navbar */
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
  font-family: 'Roboto', sans-serif;
}

.title {
  font-size: 1.5rem;
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
  font-size: 1.5rem;
  width: 100%;
  text-align: center;
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

/* Content */
.content {
  margin-left: 200px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

/* Profile header */
.profile-header {
  display: flex;
  gap: 30px;
  width: 100%;
  max-width: 600px;
}

.profile-pic {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  border: solid black 2px;
}
.stats {
  display: flex;
  justify-content: center;
  gap: 15px; /* ✅ Espace horizontal entre chaque bloc */
  margin-top: 15px;
}

.stat-item {
  text-align: center;
  min-width: 80px; /* ✅ Garde chaque élément bien espacé même sur petits écrans */
}

.stat-item strong {
  display: block;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px; /* ✅ Petit espace entre le chiffre et le texte */
}

.stat-item span {
  font-size: 14px;
  color: black;
}



.edit-btn {
  padding: 8px 16px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease; /* transition douce */
}

.edit-btn:hover {
  background-color: #f0f0f0; /* léger hover */
}

.edit-btn:active {
  transform: scale(0.95); /* effet “pression” */
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); /* légère ombre intérieure */
}


/* Underline + posts */
.underline-wrapper {
  width: 100%;
  max-width: 800px;
  margin: 40px auto 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.underline {
  width: 100%;
  height: 2px;
  background-color: black;
  margin-bottom: 20px;
}

.posts-gallery {
  display: grid;
  grid-template-columns: repeat(3, 260px);
  gap: 10px;
}

.post-container {
  position: relative;
  width: 260px;
  height: 260px;
  overflow: hidden;
  border-radius: 6px;
  cursor: pointer;
  background: none; /* retire tout fond inutile */
  border: none; /* enlève toute bordure résiduelle */
  padding: 0;
  margin: 0;
}

.post-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block; /* élimine les petits espaces sous l’image */
  border: none;
  border-radius: 6px;
}

/* Overlay sombre */
.post-container::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0);
  transition: background-color 0.3s ease;
  border-radius: 6px;
  pointer-events: none; /* pour ne pas bloquer le clic */
}

.post-container:hover::after {
  background-color: rgba(0, 0, 0, 0.4);
}


/* + button */
.add-post-container {
  position: fixed;
  bottom: 80px;
  left: calc(50% + 100px);
  transform: translateX(-50%);
}

.add-post-btn {
  width: 70px;
  height: 70px;
  font-size: 40px;
  border-radius: 50%;
  border: 1px solid #ccc;
  background: #f0f0f0;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  display: flex;
  width: 85vw;           /* largeur totale augmentée */
  max-width: 1300px;     /* plus grand sur grands écrans */
  height: 85vh;          /* plus haut */
  background-color: #fff;
  border-radius: 6px;
  overflow: hidden;
}

/* L’image prend plus d’espace (≈ 70%) */
.modal-left {
  flex: 0 0 70%;
  background-color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.modal-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0; /* supprime le léger arrondi qui pouvait créer un espace */
}

/* La colonne de commentaires est plus étroite (≈ 30%) */
.modal-right {
  flex: 0 0 30%;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  padding: 15px;
}



.comments-header {
  position: relative; /* obligatoire pour que le menu absolu soit relatif à ce parent */
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ccc;
  padding-bottom: 5px;
  margin-bottom: 5px;
}

/* Bouton 3 points */
.menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  
}

.menu-icon {
  width: 24px;
  height: 24px;
  color: #000;
  margin-left: -80px; /* décale le bouton vers la gauche */
}

.options-menu {
  position: absolute;
  top: 35px;           /* distance verticale depuis le bouton */
  right: 0;            /* point d’ancrage horizontal */
  transform: translateX(-20px); /* décalage vers la gauche de 20px */
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  z-index: 10;
  display: flex;
  flex-direction: column;
  width: 120px;
}


.menu-item {
  padding: 10px;
  text-align: left;
  font-size: 0.9rem;
  background: white;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background-color: #f2f2f2;
}

.menu-item.delete {
  color: red;
  font-weight: 600;
  font-family: Roboto, sans-serif;
}

.menu-item.cancel {
  color: #000;
  font-family: Roboto, sans-serif;
}

.comments-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 10px; /* espace avant le champ de saisie */
}

.comment {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.comment-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.comment-pseudo {
  font-size: 0.85rem;
}

.comment-text {
  margin-left: 32px; /* laisse de l'espace pour l'avatar */
  font-size: 0.9rem;
}

.add-comment {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border-top: 1px solid #ddd; /* fine séparation */
  background-color: #fff;      /* fond blanc net */
  position: sticky;
  bottom: 0;
  box-sizing: border-box;
}

/* Champ de saisie type barre */
.add-comment textarea {
  flex: 1;
  border: none;
  outline: none;
  padding: 8px 10px;
  font-size: 0.9rem;
  background: none;
  border-radius: 0;
  font-family: 'Roboto', sans-serif; /* <-- même police que le reste */
  resize: none;       /* empêche le redimensionnement */
  overflow-y: auto;   /* permet le scroll vertical si le texte est trop long */
  min-height: 24px;   /* hauteur minimale */
  max-height: 80px;   /* limite la hauteur pour garder l'UI propre */
}


/* Supprime complètement la bulle arrondie */
.add-comment input {
  border-radius: 0;
}

/* Bouton envoyer simple */
.send-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
}

.send-icon {
  width: 20px;
  height: 20px;
  color: #000;
}

.comments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ccc;
  padding-bottom: 5px;
  margin-bottom: 5px;
  position: relative;
}

.post-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-top: 1px solid #ddd;
  background-color: #fff;
}

.icon {
  width: 24px;
  height: 24px;
  color: #000;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.icon:hover {
  transform: scale(1.1);
}

.heart {
  stroke: #000;
  fill: transparent;
  transition: all 0.3s ease;
}

.heart.liked {
  stroke: #e0245e; /* rouge Instagram */
  fill: #e0245e;
  transform: scale(1.15);
}

.user-bio {
  white-space: pre-line; /* garde les sauts de ligne de la bio */
}


</style>
