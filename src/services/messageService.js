import { addDoc, collection, deleteDoc, doc, getDoc, limitToLast, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";

export const subscribeConversations = (uid, callback, onError) => onSnapshot(
  query(collection(db, "conversations"), where("participants", "array-contains", uid)),
  snapshot => callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    .sort((left, right) => (right.createdAt?.toMillis?.() || 0) - (left.createdAt?.toMillis?.() || 0))),
  onError,
);

export const subscribeConversationMessages = (conversationId, callback, onError) => onSnapshot(
  query(collection(db, "conversations", conversationId, "messages"), orderBy("createdAt", "asc"), limitToLast(100)),
  snapshot => callback(snapshot.docs.map(message => ({ id: message.id, ...message.data() }))),
  onError,
);

export const subscribeBlockedUsers = (uid, callback, onError) => onSnapshot(
  collection(db, "users", uid, "blocked"),
  snapshot => callback(snapshot.docs.map(item => item.id)),
  onError,
);

export const getMessageMember = async uid => {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) throw new Error("member-not-found");
  const { pseudo, photo } = snapshot.data();
  return { id: uid, pseudo, photo };
};

export const sendMessageRequest = async (senderId, recipientId, text) => {
  const initialText = text.trim();
  if (!initialText || initialText.length > 2000 || senderId === recipientId) throw new Error("invalid-message");
  const [following, followedBy] = await Promise.all([
    getDoc(doc(db, "users", senderId, "following", recipientId)),
    getDoc(doc(db, "users", recipientId, "following", senderId)),
  ]);
  const conversationId = `${senderId}_${recipientId}`;
  await setDoc(doc(db, "conversations", conversationId), {
    senderId,
    recipientId,
    participants: [senderId, recipientId],
    status: following.exists() && followedBy.exists() ? "accepted" : "pending",
    initialText,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return conversationId;
};

export const respondToMessageRequest = (conversationId, status) => {
  if (!['accepted', 'declined'].includes(status)) throw new Error("invalid-response");
  return updateDoc(doc(db, "conversations", conversationId), { status, updatedAt: serverTimestamp() });
};

export const sendConversationMessage = (conversationId, uid, text) => {
  const message = text.trim();
  if (!message || message.length > 2000) throw new Error("invalid-message");
  return addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId: uid,
    text: message,
    createdAt: serverTimestamp(),
  });
};

export const setUserBlocked = (uid, targetUid, blocked) => {
  const blockRef = doc(db, "users", uid, "blocked", targetUid);
  return blocked ? setDoc(blockRef, { uid: targetUid, createdAt: serverTimestamp() }) : deleteDoc(blockRef);
};