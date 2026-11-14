export const canRespondToRequest = (conversation, uid) =>
  conversation?.status === "pending" && conversation.recipientId === uid;

export const canSendInConversation = (conversation, uid) =>
  conversation?.status === "accepted" && conversation.participants?.includes(uid);

export const conversationSection = (conversation, uid) => {
  if (conversation.status === "pending" && conversation.recipientId === uid) return "requests";
  if (conversation.status === "pending" && conversation.senderId === uid) return "sent";
  if (conversation.status === "declined" && conversation.senderId === uid) return "sent";
  if (conversation.status === "accepted") return "conversations";
  return "closed";
};