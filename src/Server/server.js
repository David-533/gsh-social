import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Mets ta clé Groq ici
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = "openai/gpt-oss-120b";  // ou llama3-70b si tu préfères

// ✅ Stockage simple de l'utilisateur connecté (en mémoire)
let connectedUser = null;

// ✅ Endpoint pour connecter un utilisateur
app.post("/api/login", (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Nom d'utilisateur manquant" });
  }

  connectedUser = {
    name: username,
    connectedAt: new Date().toISOString()
  };

  console.log("✅ Utilisateur connecté :", connectedUser);

  res.json({ success: true, user: connectedUser });
});

// ✅ Endpoint pour vérifier si un utilisateur est connecté
app.get("/api/user", (req, res) => {
  if (!connectedUser) {
    return res.json({ connected: false });
  }

  res.json({
    connected: true,
    user: connectedUser
  });
});

// ✅ Endpoint principal du bot (Groq)
app.post("/api/chat", async (req, res) => {
  const { message, user } = req.body;

  try {
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

    const reply = data.choices?.[0]?.message?.content || "Je n'ai pas compris.";

    res.json({ reply });

  } catch (err) {
    console.error("❌ Erreur Groq :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


app.listen(3001, () => {
  console.log("✅ Serveur Groq sur http://localhost:3001");
});
