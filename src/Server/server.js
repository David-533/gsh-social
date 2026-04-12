// Serveur Express.js qui gère le chat avec l'API Groq
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

// Crée l'application Express
const app = express();
// Active CORS pour permettre les demandes cross-origin
app.use(cors());
// Ajoute le middleware pour parser les JSON
app.use(express.json());

// ✅ Configuration de l'API Groq
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = "openai/gpt-oss-120b";  // Modèle d'IA à utiliser

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

/**
 * Endpoint POST /api/chat
 * Envoie un message à l'API Groq et reçoit une réponse du bot
 * Le bot utilise le contexte de l'utilisateur connecté
 */
app.post("/api/chat", async (req, res) => {
  const { message, user } = req.body;

  try {
    // Appelle l'API Groq pour générer una réponse
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          // Configuration du prompt du système : le bot est amical et adapté au contexte
          messages: [
            {
              role: "system",
              content: `
Tu es un bot amical dans une application sociale.
Voici des informations sur l'utilisateur connecté :
- Nom : ${connectedUser?.name || "Inconnu"}
- Connecté depuis : ${connectedUser?.connectedAt || "Non connecté"}

Réponds toujours de manière naturelle, chaleureuse et adaptée.
              `
            },
            {
              role: "user",
              content: `${user} dit : ${message}`
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log("✅ Réponse Groq :", JSON.stringify(data, null, 2));

    // Extrait la réponse du bot ou affiche un message par défaut
    const reply = data.choices?.[0]?.message?.content || "Je n'ai pas compris.";

    res.json({ reply });

  } catch (err) {
    console.error("❌ Erreur Groq :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Démarre le serveur sur le port 3001
app.listen(3001, () => {
  console.log("✅ Serveur Groq sur http://localhost:3001");
});
