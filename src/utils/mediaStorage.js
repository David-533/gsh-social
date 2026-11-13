const DATABASE_NAME = "cercle-media";
const STORE_NAME = "profile-media";
const DATABASE_VERSION = 1;

const openDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: "key" });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error("Impossible d’ouvrir le stockage média."));
});

const mediaKey = (accountId, mediaId) => `${accountId}:${mediaId}`;

export const saveProfileMedia = async (accountId, mediaId, file) => {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ key: mediaKey(accountId, mediaId), file });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Impossible d’enregistrer ce média."));
    transaction.onabort = () => reject(transaction.error || new Error("L’enregistrement du média a été interrompu."));
  });
  database.close();
};

export const readProfileMedia = async (accountId, mediaId) => {
  const database = await openDatabase();
  const file = await new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .get(mediaKey(accountId, mediaId));
    request.onsuccess = () => resolve(request.result?.file || null);
    request.onerror = () => reject(request.error || new Error("Impossible de lire ce média."));
  });
  database.close();
  return file;
};

export const deleteProfileMedia = async (accountId, mediaId) => {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(mediaKey(accountId, mediaId));
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Impossible de supprimer ce média."));
  });
  database.close();
};
