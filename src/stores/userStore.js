import { defineStore } from "pinia";

export const DEFAULT_PROFILE_PHOTO = `${import.meta.env.BASE_URL}default_pp.svg`;

const readStoredValue = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const accountStorageId = account => {
  if (!account) return "anonymous";
  const identity = account.id || account.uid || account.email?.trim().toLowerCase() || account.pseudo;
  return encodeURIComponent(identity);
};

const COMMUNITY_KEY = "sio:community:members";

const readAccounts = () => {
  const storedAccounts = readStoredValue("users", []);
  const accounts = Array.isArray(storedAccounts)
    ? storedAccounts.filter(account => account && typeof account === "object")
    : [];
  const legacyAccount = readStoredValue("user", null);
  if (legacyAccount?.pseudo && legacyAccount?.password && !accounts.some(account => account.email === legacyAccount.email)) {
    accounts.push(legacyAccount);
  }
  return accounts;
};

export const useUserStore = defineStore("user", {
  state: () => ({
    user: readStoredValue("user", null),
    isLoggedIn: localStorage.getItem("isLogged") === "true",
  }),

  actions: {
    findLegacyAccount(identifier, password) {
      const normalizedIdentifier = identifier.trim().toLowerCase();
      return readAccounts().find(candidate =>
        (candidate.email?.toLowerCase() === normalizedIdentifier || candidate.pseudo?.toLowerCase() === normalizedIdentifier)
        && candidate.password === password
      );
    },

    removeLegacyAccount(email) {
      const users = readStoredValue("users", []);
      if (Array.isArray(users)) {
        const remaining = users.filter(account => account.email?.toLowerCase() !== email.toLowerCase());
        if (remaining.length) localStorage.setItem("users", JSON.stringify(remaining));
        else localStorage.removeItem("users");
      }
      const current = readStoredValue("user", null);
      if (current?.email?.toLowerCase() === email.toLowerCase()) localStorage.removeItem("user");
    },

    loginWithGoogle(profile) {
      const account = {
        id: profile.uid || profile.email.trim().toLowerCase(),
        uid: profile.uid,
        pseudo: profile.pseudo,
        email: profile.email,
        photo: profile.photo || DEFAULT_PROFILE_PHOTO,
        provider: "google",
      };
      this.setSession(account, true);
    },

    setSession(account, isGoogleAccount = false) {
      this.user = { ...account };
      if (isGoogleAccount) this.user.provider = "google";
      this.isLoggedIn = true;
      localStorage.setItem("user", JSON.stringify(this.user));
      localStorage.setItem("isLogged", "true");
      if (!this.getUserData("profile", null)) {
        this.setUserData("profile", {
          pseudo: account.pseudo,
          photo: account.photo || DEFAULT_PROFILE_PHOTO,
          bio: "",
          gender: "",
          followers: 0,
          following: 0,
        });
      }
      this.publishCurrentProfile();
    },

    getUserData(collection, fallback) {
      return readStoredValue(`sio:${accountStorageId(this.user)}:${collection}`, fallback);
    },

    getAccountData(accountId, collection, fallback) {
      return readStoredValue(`sio:${accountId}:${collection}`, fallback);
    },

    getAccountStorageId() {
      return accountStorageId(this.user);
    },

    getMediaInteractions(mediaId, ownerId = this.getAccountStorageId()) {
      return readStoredValue(`sio:media-interactions:${encodeURIComponent(ownerId)}:${mediaId}`, { likesBy: [], comments: [] });
    },

    setMediaInteractions(mediaId, interactions, ownerId = this.getAccountStorageId()) {
      localStorage.setItem(`sio:media-interactions:${encodeURIComponent(ownerId)}:${mediaId}`, JSON.stringify(interactions));
    },

    deleteMediaInteractions(mediaId, ownerId = this.getAccountStorageId()) {
      localStorage.removeItem(`sio:media-interactions:${encodeURIComponent(ownerId)}:${mediaId}`);
    },

    getCommunityMembers() {
      const members = readStoredValue(COMMUNITY_KEY, []);
      return Array.isArray(members) ? members.filter(member => member?.id) : [];
    },

    publishCurrentProfile() {
      if (!this.user) return;
      const profile = this.getProfile();
      const members = this.getCommunityMembers();
      const memberId = accountStorageId(this.user);
      const index = members.findIndex(member => member.id === memberId);
      const member = {
        id: memberId,
        pseudo: profile.pseudo,
        email: this.user.email || "",
        photo: profile.photo || DEFAULT_PROFILE_PHOTO,
        bio: profile.bio || "",
        following: members[index]?.following || [],
      };
      if (index >= 0) members[index] = member;
      else members.push(member);
      localStorage.setItem(COMMUNITY_KEY, JSON.stringify(members));
    },

    toggleFollow(memberId) {
      const currentId = accountStorageId(this.user);
      if (!this.user || memberId === currentId) return;
      const members = this.getCommunityMembers();
      const currentIndex = members.findIndex(member => member.id === currentId);
      if (currentIndex < 0) return;
      const following = new Set(members[currentIndex].following || []);
      if (following.has(memberId)) following.delete(memberId);
      else following.add(memberId);
      members[currentIndex] = { ...members[currentIndex], following: [...following] };
      localStorage.setItem(COMMUNITY_KEY, JSON.stringify(members));
    },

    getFollowCounts() {
      return this.getFollowCountsFor(accountStorageId(this.user));
    },

    getFollowCountsFor(memberId) {
      const members = this.getCommunityMembers();
      const currentMember = members.find(member => member.id === memberId);
      return {
        following: currentMember?.following?.length || 0,
        followers: members.filter(member => member.id !== memberId && member.following?.includes(memberId)).length,
      };
    },

    setUserData(collection, value) {
      localStorage.setItem(`sio:${accountStorageId(this.user)}:${collection}`, JSON.stringify(value));
    },

    getPosts() {
      const currentPosts = this.getUserData("posts", null);
      if (Array.isArray(currentPosts)) return currentPosts;

      const feedPosts = this.getUserData("homePosts", []);
      const legacyPhotos = this.getUserData("userPosts", []);
      const legacyComments = this.getUserData("userComments", []);
      const profile = this.getProfile();
      const migratedPosts = Array.isArray(feedPosts) ? feedPosts.map((post, index) => ({
        ...post,
        id: post.id || `migrated-feed-${index}`,
        authorId: post.authorId || this.user?.id || this.user?.email,
        user: post.user || profile.pseudo,
        userPhoto: post.userPhoto || profile.photo,
        likes: Number(post.likes) || 0,
        liked: Boolean(post.liked),
        comments: Array.isArray(post.comments) ? post.comments : [],
        createdAt: post.createdAt || new Date().toISOString(),
      })) : [];

      if (Array.isArray(legacyPhotos)) {
        legacyPhotos.forEach((photo, index) => {
          const image = typeof photo === "string" ? photo : photo?.image;
          if (!image || migratedPosts.some(post => post.image === image)) return;
          migratedPosts.push({
            id: `migrated-profile-${index}`,
            authorId: this.user?.id || this.user?.email,
            user: profile.pseudo,
            userPhoto: profile.photo,
            text: typeof photo === "object" ? photo.text || "" : "",
            image,
            likes: 0,
            liked: false,
            comments: (legacyComments[index] || []).map((comment, commentIndex) => typeof comment === "string"
              ? { id: `migrated-comment-${index}-${commentIndex}`, user: profile.pseudo, userPhoto: profile.photo, text: comment }
              : comment),
            createdAt: new Date().toISOString(),
          });
        });
      }

      this.setUserData("posts", migratedPosts);
      return migratedPosts;
    },

    setPosts(posts) {
      this.setUserData("posts", posts);
    },

    getProfile() {
      const profile = this.getUserData("profile", {
        pseudo: this.user?.pseudo || "Utilisateur",
        photo: this.user?.photo || DEFAULT_PROFILE_PHOTO,
        bio: "",
        gender: "",
        followers: 0,
        following: 0,
      });
      if (!profile.photo || profile.photo === "/default_pp.png" || profile.photo === "/default_pp.svg") {
        profile.photo = DEFAULT_PROFILE_PHOTO;
        this.setUserData("profile", profile);
      }
      return profile;
    },

    updateProfile(profile) {
      const previousPseudo = this.getProfile().pseudo;
      const currentProfile = this.getProfile();
      const updatedProfile = { ...currentProfile, ...profile };
      this.setUserData("profile", updatedProfile);
      this.user = {
        ...this.user,
        pseudo: updatedProfile.pseudo,
        photo: updatedProfile.photo,
      };
      localStorage.setItem("user", JSON.stringify(this.user));

      const posts = this.getPosts();
      posts.forEach(post => {
        if (post.user === previousPseudo || post.authorId === this.user.id || post.authorId === this.user.email) {
          post.user = updatedProfile.pseudo;
          post.userPhoto = updatedProfile.photo;
        }
        (post.comments || []).forEach(comment => {
          if (comment.user === previousPseudo) comment.userPhoto = updatedProfile.photo;
        });
      });
      this.setPosts(posts);
      this.publishCurrentProfile();
    },

    logout() {
      this.user = null;
      this.isLoggedIn = false;
      localStorage.removeItem("user");
      localStorage.removeItem("isLogged");
    },
  },
});

