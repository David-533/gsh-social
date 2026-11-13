export const filterPublicFeed = (posts, currentUid) => {
  return posts
    .filter(post => post.authorId !== currentUid && post.surface === "feed")
    .sort((left, right) => (right.createdAt?.toMillis?.() || 0) - (left.createdAt?.toMillis?.() || 0))
    .slice(0, 50);
};