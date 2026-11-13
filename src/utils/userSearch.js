export const filterSearchableUsers = (users, searchText, currentUid) => {
  const term = searchText.trim().toLocaleLowerCase("fr-FR");
  if (term.length < 2) return [];
  return users.filter(user => user.id !== currentUid
    && String(user.usernameLower || user.pseudo || "").toLocaleLowerCase("fr-FR").startsWith(term));
};