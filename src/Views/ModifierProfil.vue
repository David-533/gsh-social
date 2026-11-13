<template>
  <main class="social-page edit-page">
    <header class="page-heading">
      <div><p class="page-eyebrow">TON ESPACE</p><h1>Modifier le profil</h1><p class="page-description">Mets à jour les informations visibles par ta communauté.</p></div>
      <RouterLink class="edit-back-link" to="/profil">Retour au profil</RouterLink>
    </header>

    <form class="edit-form" @submit.prevent="saveProfile">
      <section class="edit-section">
        <div class="edit-section-heading"><h2>Photo de profil</h2><p>Une image carrée fonctionne le mieux.</p></div>
        <div class="avatar-editor">
          <img :src="userPhoto || defaultPhoto" :alt="`Aperçu de la photo de ${userPseudo || 'profil'}`" />
          <div>
            <label class="photo-select" for="profile-photo">Choisir une photo</label>
            <input id="profile-photo" ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" @change="handleFileChange" />
            <p>JPG, PNG ou WebP · 5 Mo maximum · enregistrée jusqu’à 512 px</p>
          </div>
        </div>
      </section>

      <section class="edit-section">
        <div class="edit-section-heading"><h2>Informations</h2><p>Choisis comment tu apparais dans le fil.</p></div>
        <div class="edit-fields">
          <label class="edit-field" for="profile-pseudo"><span>Pseudo</span><input id="profile-pseudo" v-model.trim="userPseudo" type="text" minlength="3" maxlength="32" autocomplete="nickname" required /></label>
          <label class="edit-field" for="profile-bio"><span>Bio</span><textarea id="profile-bio" v-model="userBio" maxlength="160" rows="4" placeholder="Quelques mots pour te présenter…"></textarea><small>{{ userBio.length }}/160</small></label>
        </div>
      </section>

      <p v-if="errorMessage" class="edit-error" role="alert">{{ errorMessage }}</p>
      <footer class="edit-actions">
        <RouterLink class="cancel-edit" to="/profil">Annuler</RouterLink>
        <button class="save-profile" type="submit" :disabled="isSaving">{{ isSaving ? "Enregistrement…" : "Enregistrer les modifications" }}</button>
      </footer>
    </form>
  </main>
</template>

<script>
/**
 * Composant ModifierProfil - Permet de modifier les données du profil utilisateur
 * - Pseudo
 * - Bio
 * - Genre
 * - Photo de profil
 */
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { DEFAULT_PROFILE_PHOTO, useUserStore } from "../stores/userStore";
import { updateUserProfile, uploadProfilePhoto } from "../services/socialService";

export default {
  name: "ModifierProfil",
  setup() {
    const router = useRouter();
    const userStore = useUserStore();

    const userPseudo = ref("");
    const userPhoto = ref(null);
    const userBio = ref("");
    const fileInput = ref(null);
    const defaultPhoto = DEFAULT_PROFILE_PHOTO;
    const errorMessage = ref("");
    const isSaving = ref(false);

    /**
     * Charge les données du profil depuis localStorage au montage du composant
     */
    onMounted(() => {
      const profile = userStore.getProfile();
      userPseudo.value = profile.pseudo || "";
      userPhoto.value = profile.photo || defaultPhoto;
      userBio.value = profile.bio || "";
    });

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      errorMessage.value = "";

      if (!file.type.startsWith("image/")) {
        errorMessage.value = "Choisis un fichier image valide.";
        e.target.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        errorMessage.value = "La photo doit faire 5 Mo maximum.";
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = event => { userPhoto.value = event.target.result; };
      reader.onerror = () => { errorMessage.value = "La lecture de cette photo a échoué."; };

      reader.readAsDataURL(file);
    };

    const saveProfile = async () => {
      if (userPseudo.value.trim().length < 3) {
        errorMessage.value = "Le pseudo doit contenir au moins 3 caractères.";
        return;
      }
      isSaving.value = true;
      errorMessage.value = "";
      try {
        const photo = userPhoto.value?.startsWith("data:")
          ? await uploadProfilePhoto(userStore.user.uid, userPhoto.value)
          : userPhoto.value || defaultPhoto;
        const changes = { pseudo: userPseudo.value.trim(), photo, bio: userBio.value.trim() };
        await updateUserProfile(userStore.user.uid, changes);
        userStore.updateProfile(changes);
        await router.push("/profil");
      } catch (error) {
        errorMessage.value = error.message === "image-too-large"
          ? "Cette image est trop détaillée pour être enregistrée. Choisis une autre photo."
          : error.code === "permission-denied"
          ? "Vérifie les règles Firestore de ton projet Firebase."
          : error.message?.includes("pseudo")
            ? error.message
            : "Impossible d’enregistrer le profil. Vérifie Firestore et Cloudinary.";
      } finally {
        isSaving.value = false;
      }
    };

    return {
      userPseudo, userPhoto, userBio, defaultPhoto, fileInput, errorMessage, isSaving,
      handleFileChange, saveProfile
    };
  }
};
</script>


<style scoped>
.edit-page { width: min(100%, 760px); margin: 0 auto; color: #23332d; }
.edit-page .page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 15px; margin-bottom: 22px; }
.edit-page .page-eyebrow { margin: 0 0 6px; color: #66836f; font-size: 9px; font-weight: 700; }
.edit-page .page-heading h1 { margin: 0; color: #19382f; font: 600 27px 'Space Grotesk', sans-serif; }
.edit-page .page-description { margin: 6px 0 0; color: #78857d; font-size: 12px; }
.edit-back-link { color: #4c6852; font-size: 11px; font-weight: 600; text-decoration: none; }
.edit-form { overflow: hidden; border: 1px solid #e1e8e0; border-radius: 7px; background: #fff; }
.edit-section { padding: 22px 24px; border-bottom: 1px solid #edf0ec; }
.edit-section-heading h2 { margin: 0; color: #2a4033; font: 600 14px 'Space Grotesk', sans-serif; }
.edit-section-heading p { margin: 5px 0 0; color: #849087; font-size: 10px; }
.avatar-editor { display: flex; align-items: center; gap: 16px; margin-top: 20px; }
.avatar-editor > img { width: 76px; height: 76px; flex: 0 0 76px; border: 1px solid #e3e9e1; border-radius: 50%; object-fit: cover; }
.avatar-editor > div { display: grid; justify-items: start; gap: 7px; }
.photo-select { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; border: 1px solid #dfe6dc; border-radius: 5px; color: #405c47; background: #fff; font-size: 10px; font-weight: 700; cursor: pointer; }
.avatar-editor input[type="file"] { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
.avatar-editor p { margin: 0; color: #87918a; font-size: 9px; }
.edit-fields { display: grid; max-width: 520px; gap: 17px; margin-top: 20px; }
.edit-field { display: grid; gap: 7px; color: #34473b; font-size: 11px; font-weight: 700; }
.edit-field input, .edit-field textarea { width: 100%; padding: 10px 11px; border: 1px solid #dfe6dc; border-radius: 5px; outline: none; color: #263b30; background: #fcfdfb; font: 12px 'DM Sans', sans-serif; box-sizing: border-box; }
.edit-field input { height: 40px; }
.edit-field textarea { min-height: 96px; resize: vertical; line-height: 1.5; }
.edit-field input:focus, .edit-field textarea:focus { border-color: #86a878; box-shadow: 0 0 0 3px rgba(112,151,91,.12); }
.edit-field small { justify-self: end; color: #87918a; font-size: 9px; font-weight: 400; }
.edit-error { margin: 0; padding: 0 24px 12px; color: #a9463b; font-size: 11px; }
.edit-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 15px 24px; background: #fcfdfb; }
.cancel-edit, .save-profile { display: inline-flex; min-height: 38px; align-items: center; justify-content: center; padding: 0 13px; border: 1px solid #dfe6dc; border-radius: 5px; color: #526158; background: #fff; font: 600 10px 'DM Sans', sans-serif; text-decoration: none; cursor: pointer; }
.save-profile { border-color: #c9ef74; color: #19382f; background: #c9ef74; }

@media (max-width: 600px) {
  .edit-page .page-heading { align-items: flex-start; }
  .edit-page .page-heading h1 { font-size: 23px; }
  .edit-back-link { padding-top: 5px; white-space: nowrap; }
  .edit-section { padding: 18px 15px; }
  .edit-actions { padding: 12px 15px; }
  .edit-error { padding: 0 15px 10px; }
  .save-profile { flex: 1; }
}
</style>