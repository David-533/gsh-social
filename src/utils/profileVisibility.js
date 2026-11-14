export const canViewProfilePosts = ({ isOwnProfile, profilePublic, following }) =>
  Boolean(isOwnProfile || profilePublic !== false || following);