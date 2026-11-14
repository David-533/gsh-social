import "dotenv/config";
import express from "express";
import cors from "cors";

// Crée l'application Express
const app = express();
// Active CORS pour permettre les demandes cross-origin
app.use(cors());
// Ajoute le middleware pour parser les JSON
app.use(express.json());

const PORT = Number(process.env.PORT) || 3001;

// ✅ Stockage simple de l'utilisateur connecté (en mémoire, pas de base de données)
let connectedUser = null;

/**
 * Endpoint POST /api/login
 * Marque un utilisateur comme connecté
 * Récupère le nom d'utilisateur depuis le body de la requête
 */
app.post("/api/login", (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Nom d'utilisateur manquant" });
  }

  // Enregistre l'utilisateur avec l'heure de connexion
  connectedUser = {
    name: username,
    connectedAt: new Date().toISOString()
  };

  console.log("✅ Utilisateur connecté :", connectedUser);

  res.json({ success: true, user: connectedUser });
});

/**
 * Endpoint GET /api/user
 * Vérifie si un utilisateur est actuellement connecté
 */
app.get("/api/user", (req, res) => {
  if (!connectedUser) {
    return res.json({ connected: false });
  }

  res.json({
    connected: true,
    user: connectedUser
  });
});

app.listen(PORT, () => {
  console.log(`✅ Serveur social sur http://localhost:${PORT}`);
});
