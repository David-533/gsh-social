<template>
  <div class="page-container">
    <!-- NAVBAR -->
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

    <!-- CONTENU -->
    <div class="content">
      <div class="posts-container">
        <div v-for="(post, postIndex) in posts" :key="postIndex" class="post-card">
          
          <!-- POST HEADER -->
          <div class="post-header">
            <img :src="post.userPhoto || '/default_pp.png'" class="post-pic" />
            <p class="post-user">{{ post.user || 'Utilisateur' }}</p>
          </div>

          <!-- POST TEXTE -->
          <p class="post-text" v-if="post.text">{{ post.text }}</p>

          <!-- POST IMAGE -->
          <div v-if="post.image" class="post-image-wrapper">
            <img :src="post.image" class="post-image" />
          </div>

          <!-- ACTIONS -->
          <div class="post-actions">
            <button class="like-btn" @click="toggleLike(post)">
              <span :class="{ liked: post.liked }">❤️</span> {{ post.likes }}
            </button>
          </div>

          <!-- COMMENTAIRES -->
          <div class="comments-section">
            <div v-for="(com, i) in post.comments" :key="i" class="comment">
              <img :src="com.userPhoto || '/default_pp.png'" class="comment-pic" />
              <strong>{{ com.user || 'Utilisateur' }}:</strong> {{ com.text }}
            </div>

            <div class="add-comment">
              <input v-model="post.newComment" type="text" placeholder="Écrire un commentaire..." @keyup.enter="addComment(post)" />
              <button class="comment-btn" @click="addComment(post)">Envoyer</button>
            </div>
          </div>

        </div>
      </div>

      <!-- BOUTON AJOUT POST -->
      <button class="floating-btn" @click="openPostModal">+</button>

      <!-- MODAL -->
      <div v-if="isModalOpen" class="modal-overlay" @click.self="closePostModal">
        <div class="modal">
          <div class="modal-header">
            <h2>Créer un post</h2>
          </div>

          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

          <div class="modal-textarea-wrapper">
            <textarea v-model="postText" placeholder="Écris ton post..."></textarea>
          </div>

          <div class="file-upload">
            <label for="file-input" class="file-label"></label>
            <input id="file-input" type="file" accept="image/*" @change="handleImageUpload" />
            <span v-if="imagePreview">Aperçu sélectionné</span>
          </div>

          <div v-if="imagePreview" class="img-preview">
            <img :src="imagePreview" />
          </div>

          <div class="modal-actions">
            <button class="publish-btn" @click="submitPost">Publier</button>
            <button class="cancel-btn" @click="closePostModal">Annuler</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";

export default {
  name: "Home",
  setup() {
    const router = useRouter();
    const userPseudo = ref(localStorage.getItem("userPseudo") || "Utilisateur");
    const userPhoto = ref(localStorage.getItem("userPhoto") || "/default_pp.png");
    const posts = ref(JSON.parse(localStorage.getItem("homePosts") || "[]"));
    const isModalOpen = ref(false);
    const postText = ref("");
    const imagePreview = ref(null);
    const errorMessage = ref("");

    // ✅ Recharge la photo + met à jour les posts et commentaires existants
    onMounted(() => {
      const newPhoto = localStorage.getItem("userPhoto") || "/default_pp.png";
      userPhoto.value = newPhoto;

      posts.value.forEach(post => {
        // ✅ Met à jour la photo des posts
        if (post.user === userPseudo.value) {
          post.userPhoto = newPhoto;
        }

        // ✅ Met à jour la photo des commentaires
        post.comments.forEach(com => {
          if (com.user === userPseudo.value) {
            com.userPhoto = newPhoto;
          }
        });
      });
    });

    // ✅ Met à jour automatiquement si localStorage change
    window.addEventListener("storage", () => {
      const newPhoto = localStorage.getItem("userPhoto") || "/default_pp.png";
      userPhoto.value = newPhoto;

      posts.value.forEach(post => {
        if (post.user === userPseudo.value) {
          post.userPhoto = newPhoto;
        }

        post.comments.forEach(com => {
          if (com.user === userPseudo.value) {
            com.userPhoto = newPhoto;
          }
        });
      });
    });

    watch(posts, (newPosts) => {
      localStorage.setItem("homePosts", JSON.stringify(newPosts));
    }, { deep: true });

    const handleLogout = () => {
      localStorage.setItem("userPseudo", userPseudo.value);
      localStorage.setItem("userPhoto", userPhoto.value);
      router.push("/login");
    };

    const openPostModal = () => { isModalOpen.value = true; errorMessage.value = ""; };
    const closePostModal = () => {
      isModalOpen.value = false;
      postText.value = "";
      imagePreview.value = null;
      errorMessage.value = "";
    };

   const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (event) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSize = 1024; // ✅ Taille max (tu peux mettre 800 si tu veux)

      let width = img.width;
      let height = img.height;

      // ✅ Redimensionnement proportionnel
      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // ✅ Convertit en Base64 compressé (JPEG 80%)
      imagePreview.value = canvas.toDataURL("image/jpeg", 0.8);
    };

    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
};


    const submitPost = () => {
      if (!postText.value.trim() && !imagePreview.value) {
        errorMessage.value = "⚠ Vous devez écrire un texte ou ajouter une image.";
        return;
      }

      posts.value.unshift({
        user: userPseudo.value,
        userPhoto: userPhoto.value || "/default_pp.png",
        text: postText.value,
        image: imagePreview.value || null,
        likes: 0,
        liked: false,
        comments: [],
        newComment: ""
      });

      closePostModal();
    };

    const toggleLike = (post) => {
      post.liked = !post.liked;
      post.likes += post.liked ? 1 : -1;
    };

    const addComment = (post) => {
      if (!post.newComment.trim()) return;
      post.comments.push({
        user: userPseudo.value,
        userPhoto: userPhoto.value || "/default_pp.png",
        text: post.newComment
      });
      post.newComment = "";
    };

    return {
      userPseudo,
      userPhoto,
      posts,
      handleLogout,
      isModalOpen,
      openPostModal,
      closePostModal,
      postText,
      imagePreview,
      errorMessage,
      handleImageUpload,
      submitPost,
      toggleLike,
      addComment
    };
  }
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
  width: 100%;
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
</style>


