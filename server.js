/**
 * server.js
 *
 * Install:
 *   npm i express cors dotenv node-fetch
 *
 * Start:
 *   node server.js
 *
 * .env:
 *   XAI_API_KEY=din_nyckel
 *   (valfritt) XAI_MODEL=grok-beta
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");

// node-fetch via dynamic import (node-fetch@3)
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const XAI_API_KEY = process.env.XAI_API_KEY; // ✅ endast från .env
const XAI_MODEL = process.env.XAI_MODEL || "grok-beta";

function isValidUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, hasXaiKey: Boolean(XAI_API_KEY), model: XAI_MODEL });
});

app.post("/analyze", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const url = (req.body?.url || "").trim();

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({
      cfData: { protocol: "HTTP/3", security: "WAF Aktiv", edge: "Edge Active", ssl: "TLS 1.3" },
      geoAnalysis: "❌ Ogiltig URL. Exempel: https://example.com",
    });
  }

  if (!XAI_API_KEY) {
    return res.status(500).json({
      cfData: { protocol: "HTTP/3", security: "WAF Aktiv", edge: "Edge Active", ssl: "TLS 1.3" },
      geoAnalysis: "❌ XAI_API_KEY saknas i .env. Lägg till den och starta om servern.",
    });
  }

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Du är en expert på SEO/GEO. Svara på svenska. För varje pelare: 1) FRÅGA, 2) SVAR, 3) SCORE (1-10).",
          },
          { role: "user", content: `Gör en djupgående GEO-analys för webbplatsen ${url} på svenska.` },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({
        cfData: { protocol: "HTTP/3", security: "WAF Aktiv", edge: "Edge Active", ssl: "TLS 1.3" },
        geoAnalysis: `❌ xAI-fel (${response.status}):\n${errText}`,
      });
    }

    const data = await response.json();
    const aiContent = data?.choices?.[0]?.message?.content;

    return res.json({
      cfData: { protocol: "HTTP/3", security: "WAF Aktiv", edge: "Edge Active", ssl: "TLS 1.3" },
      geoAnalysis: aiContent || "❌ AI:n returnerade inget innehåll.",
    });
  } catch (err) {
    return res.status(500).json({
      cfData: { protocol: "HTTP/3", security: "WAF Aktiv", edge: "Edge Active", ssl: "TLS 1.3" },
      geoAnalysis: "❌ Ett tekniskt fel uppstod vid anropet till xAI.",
    });
  }
});

app.listen(8888, "127.0.0.1", () => {
  console.log("🚀 GEO-SERVER KÖR PÅ http://127.0.0.1:8888");
  console.log("✅ Health: http://127.0.0.1:8888/health");
});