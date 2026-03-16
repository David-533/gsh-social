<template>
  <div class="modifier-page">
    <h1>Modifier le profil</h1>

    <!-- Photo de profil -->
    <img :src="userPhoto || defaultPhoto" @click="triggerFileInput" alt="" />
    <input type="file" ref="fileInput" accept="image/*" @change="handleFileChange" style="display:none" />

    <!-- Pseudo -->
    <label>Pseudo</label>
    <input type="text" v-model="userPseudo" placeholder="Entrez votre pseudo" />

    <!-- Bio -->
    <label>Bio</label>
    <textarea v-model="userBio" placeholder="Entrez votre bio..."></textarea>

    <!-- Genre -->
    <label>Genre</label>
    <select v-model="gender">
      <option value="homme">Homme</option>
      <option value="femme">Femme</option>
      <option value="autre">Autre</option>
    </select>

    <!-- Boutons -->
    <div class="btn-container">
      <button class="save-btn" @click="saveProfile">Enregistrer</button>
      <button class="back-btn" @click="goBack">Retour</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

export default {
  name: "ModifierProfil",
  setup() {
    const router = useRouter();

    const userPseudo = ref("");
    const userPhoto = ref(null);
    const userBio = ref("");
    const gender = ref("");
    const fileInput = ref(null);
    const defaultPhoto = "https://via.placeholder.com/150";

    onMounted(() => {
      userPseudo.value = localStorage.getItem("userPseudo") || "";
      userPhoto.value = localStorage.getItem("userPhoto") || defaultPhoto;
      userBio.value = localStorage.getItem("userBio") || "";
      gender.value = localStorage.getItem("userGender") || "";
    });

    const triggerFileInput = () => fileInput.value.click();

    // ✅ Nouvelle version : accepte les grandes images + redimensionne automatiquement
    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 1024; // ✅ Taille max en pixels (change si tu veux)

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
          userPhoto.value = canvas.toDataURL("image/jpeg", 0.8);
        };

        img.src = event.target.result;
      };

      reader.readAsDataURL(file);
    };

    const saveProfile = () => {
      localStorage.setItem("userPseudo", userPseudo.value);
      localStorage.setItem("userPhoto", userPhoto.value || defaultPhoto);
      localStorage.setItem("userBio", userBio.value);
      localStorage.setItem("userGender", gender.value);
      router.push("/profil");
    };

    const goBack = () => {
      router.push("/profil");
    };

    return {
      userPseudo, userPhoto, userBio, gender,
      defaultPhoto, fileInput,
      triggerFileInput, handleFileChange,
      saveProfile, goBack
    };
  }
};
</script>


<style scoped>
.modifier-page {
  max-width: 500px;
  margin: 50px auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-family: 'Roboto', sans-serif;
}

h1 {
  text-align: center;
  font-size: 1.8rem;
  color: #333;
  margin-bottom: 20px;
}

img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto;
  border: 2px solid #000;
  cursor: pointer;
}

label {
  font-weight: bold;
  color: #555;
}

input[type="text"],
textarea,
select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
  resize: none;
  font-family: 'Roboto', sans-serif;
  box-sizing: border-box;
}

textarea {
  min-height: 60px;
  max-height: 120px;
}

.btn-container {
  display: flex;
  justify-content: space-between;
  gap: 15px;
}

.save-btn {
  flex: 1;
  background-color: #0095f6;
  color: white;
  border: none;
  padding: 10px 0;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.save-btn:hover {
  background-color: #007ac1;
}

.back-btn {
  flex: 1;
  background-color: #eee;
  color: #333;
  border: none;
  padding: 10px 0;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.back-btn:hover {
  background-color: #ddd;
}

/* Responsive */
@media screen and (max-width: 600px) {
  .modifier-page {
    margin: 20px;
    padding: 15px;
  }

  img {
    width: 100px;
    height: 100px;
  }

  .btn-container {
    flex-direction: column;
  }
}
</style>