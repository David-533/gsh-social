import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { compressImage } from "../utils/imageCompression";
import { filterSearchableUsers } from "../utils/userSearch";
import { filterPublicFeed } from "../utils/followedFeed";

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const uploadVideo = async file => {
  if (!cloudName || !uploadPreset) throw new Error("cloudinary-not-configured");
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, { method: "POST", body });
  if (!response.ok) throw new Error("cloudinary-upload-failed");
  const result = await response.json();
  return result.secure_url;
};

const usernameKey = value => encodeURIComponent(value.trim().toLocaleLowerCase("fr-FR"));
const userReference = uid => doc(db, "users", uid);
const usernameReference = pseudo => doc(db, "usernameReservations", usernameKey(pseudo));

export const ensureUserProfile = async (firebaseUser, requestedPseudo = "") => {
  const profileRef = userReference(firebaseUser.uid);
  const profileSnapshot = await getDoc(profileRef);
  if (profileSnapshot.exists()) return { id: firebaseUser.uid, uid: firebaseUser.uid, ...profileSnapshot.data() };

  const pseudo = requestedPseudo.trim() || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Membre";
  const normalizedPseudo = pseudo.toLocaleLowerCase("fr-FR");
  const reservationRef = usernameReference(pseudo);
  const profile = {
    pseudo,
    usernameLower: normalizedPseudo,
    email: firebaseUser.email || "",
    photo: firebaseUser.photoURL || "",
    bio: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await runTransaction(db, async transaction => {
    const reservation = await transaction.get(reservationRef);
    if (reservation.exists() && reservation.data().uid !== firebaseUser.uid) {
      throw new Error("Ce pseudo est déjà utilisé. Choisis-en un autre.");
    }
    transaction.set(reservationRef, { uid: firebaseUser.uid, usernameLower: normalizedPseudo });
    transaction.set(profileRef, profile);
  });

  return { id: firebaseUser.uid, uid: firebaseUser.uid, ...profile };
};

export const updateUserProfile = async (uid, changes) => {
  const profileRef = userReference(uid);
  const currentSnapshot = await getDoc(profileRef);
  if (!currentSnapshot.exists()) throw new Error("Profil introuvable.");
  const current = currentSnapshot.data();
  const nextPseudo = changes.pseudo?.trim() || current.pseudo;
  const nextLower = nextPseudo.toLocaleLowerCase("fr-FR");
  const currentReservation = usernameReference(current.pseudo);
  const nextReservation = usernameReference(nextPseudo);

  await runTransaction(db, async transaction => {
    const currentReservationSnapshot = await transaction.get(currentReservation);
    const nextReservationSnapshot = nextReservation.path === currentReservation.path
      ? currentReservationSnapshot
      : await transaction.get(nextReservation);
    if (nextReservationSnapshot.exists() && nextReservationSnapshot.data().uid !== uid) {
      throw new Error("Ce pseudo est déjà utilisé.");
    }
    if (currentReservation.path !== nextReservation.path && currentReservationSnapshot.data()?.uid === uid) {
      transaction.delete(currentReservation);
    }
    transaction.set(nextReservation, { uid, usernameLower: nextLower });
    transaction.set(profileRef, {
      ...changes,
      pseudo: nextPseudo,
      usernameLower: nextLower,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
};

export const uploadProfilePhoto = async (uid, dataUrl) => {
  const response = await fetch(dataUrl);
  const image = await response.blob();
  return compressImage(image, 512, 240000);
};

export const searchUsers = async (searchText, currentUid) => {
  const term = searchText.trim().toLocaleLowerCase("fr-FR");
  if (term.length < 2) return [];
  const usersQuery = query(
    collection(db, "users"),
    where("usernameLower", ">=", term),
    where("usernameLower", "<=", `${term}\uf8ff`),
    orderBy("usernameLower"),
    limit(20),
  );
  const result = await getDocs(usersQuery);
  return filterSearchableUsers(result.docs.map(user => ({ id: user.id, ...user.data() })), term, currentUid);
};

export const subscribeUserProfile = (uid, callback, onError) => onSnapshot(
  userReference(uid),
  snapshot => callback(snapshot.exists() ? { id: snapshot.id, uid: snapshot.id, ...snapshot.data() } : null),
  onError,
);

export const resolveLoginEmail = async identifier => {
  const normalized = identifier.trim().toLocaleLowerCase("fr-FR");
  if (normalized.includes("@")) return normalized;
  const reservation = await getDoc(usernameReference(normalized));
  if (!reservation.exists()) return null;
  const profile = await getDoc(userReference(reservation.data().uid));
  return profile.exists() ? profile.data().email || null : null;
};

export const subscribeFeed = (currentUid, callback, onError) => {
  const feedQuery = query(
    collection(db, "posts"),
    where("surface", "==", "feed"),
    orderBy("createdAt", "desc"),
    limit(100),
  );
  return onSnapshot(feedQuery, snapshot => {
    callback(filterPublicFeed(snapshot.docs.map(post => ({ id: post.id, ...post.data() })), currentUid));
  }, onError);
};

export const createPost = async ({ user, text, file, surface = "feed" }) => {
  const postRef = doc(collection(db, "posts"));
  let mediaUrl = "";
  let mediaType = "";

  if (file) {
    if (file.type.startsWith("video/")) {
      mediaUrl = await uploadVideo(file);
      mediaType = "video";
    } else {
      mediaUrl = await compressImage(file, 1920, 650000, 0.92);
      mediaType = "image";
    }
  }

  await setDoc(postRef, {
    authorId: user.uid,
    authorName: user.pseudo,
    authorPhoto: user.photo || "",
    text: text.trim(),
    mediaUrl,
    mediaType,
    mediaPath: "",
    surface,
    createdAt: serverTimestamp(),
  });
};

export const togglePostLike = async (postId, uid) => {
  const likeRef = doc(db, "posts", postId, "likes", uid);
  await runTransaction(db, async transaction => {
    const likeSnapshot = await transaction.get(likeRef);
    if (likeSnapshot.exists()) transaction.delete(likeRef);
    else transaction.set(likeRef, { uid, createdAt: serverTimestamp() });
  });
};

export const addPostComment = async (postId, user, text) => {
  const comment = text.trim();
  if (!comment) return;
  const commentRef = await addDoc(collection(db, "posts", postId, "comments"), {
    authorId: user.uid,
    authorName: user.pseudo,
    authorPhoto: user.photo || "",
    text: comment,
    createdAt: serverTimestamp(),
  });
  return commentRef.id;
};

export const subscribePostComments = (postId, callback, onError) => {
  const commentsQuery = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"), limit(100));
  return onSnapshot(commentsQuery, snapshot => {
    callback(snapshot.docs.map(comment => ({ id: comment.id, ...comment.data() })));
  }, onError);
};

export const subscribePostLikes = (postId, uid, callback, onError) => {
  const likesRef = collection(db, "posts", postId, "likes");
  const unsubscribe = onSnapshot(likesRef, snapshot => {
    callback({ count: snapshot.size, liked: snapshot.docs.some(like => like.id === uid) });
  }, onError);
  return unsubscribe;
};

export const recordPostView = async (postId, uid, authorId) => {
  if (!uid || uid === authorId) return false;
  const viewRef = doc(db, "posts", postId, "views", uid);
  return runTransaction(db, async transaction => {
    const viewSnapshot = await transaction.get(viewRef);
    if (viewSnapshot.exists()) return false;
    transaction.set(viewRef, { uid, viewedAt: serverTimestamp() });
    return true;
  });
};

export const subscribePostViews = (postId, callback, onError) => onSnapshot(
  collection(db, "posts", postId, "views"),
  snapshot => callback(snapshot.size),
  onError,
);

export const subscribeMembers = (callback, onError) => onSnapshot(
  query(collection(db, "users"), orderBy("usernameLower"), limit(100)),
  snapshot => callback(snapshot.docs.map(member => ({ id: member.id, ...member.data() }))),
  onError,
);

export const toggleFollow = async (currentUid, targetUid) => {
  if (currentUid === targetUid) return;
  const followingRef = doc(db, "users", currentUid, "following", targetUid);
  const followerRef = doc(db, "users", targetUid, "followers", currentUid);
  await runTransaction(db, async transaction => {
    const followingSnapshot = await transaction.get(followingRef);
    if (followingSnapshot.exists()) {
      transaction.delete(followingRef);
      transaction.delete(followerRef);
    } else {
      transaction.set(followingRef, { uid: targetUid, createdAt: serverTimestamp() });
      transaction.set(followerRef, { uid: currentUid, createdAt: serverTimestamp() });
    }
  });
};

export const subscribeFollowState = (currentUid, targetUid, callback, onError) => onSnapshot(
  doc(db, "users", currentUid, "following", targetUid),
  snapshot => callback(snapshot.exists()),
  onError,
);

export const subscribeFollowCounts = (uid, callback, onError) => {
  const unsubs = ["followers", "following"].map(kind => onSnapshot(
    collection(db, "users", uid, kind),
    snapshot => callback(kind, snapshot.size),
    onError,
  ));
  return () => unsubs.forEach(unsubscribe => unsubscribe());
};

export const subscribeUserPosts = (uid, callback, onError) => onSnapshot(
  query(collection(db, "posts"), where("authorId", "==", uid), limit(100)),
  snapshot => callback(snapshot.docs
    .map(post => ({ id: post.id, ...post.data() }))
    .sort((left, right) => (right.createdAt?.toMillis?.() || 0) - (left.createdAt?.toMillis?.() || 0))),
  onError,
);

export const deletePost = async post => {
  await deleteDoc(doc(db, "posts", post.id));
};
