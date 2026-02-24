/**
 * server.js — “igår”-fallback (5 pelare) + grok-3-mini
 *
 * Install:
 *   npm install express cors dotenv node-fetch
 *
 * Start:
 *   node server.js
 *
 * .env:
 *   XAI_API_KEY=din_nyckel
 *   (valfritt) XAI_MODEL=grok-3-mini
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

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || "grok-3-mini"; // ✅

function isValidUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ✅ EXAKT “igår-känsla”: 5 pelare + score + konkret plan
function fallbackGeoIgår(url) {
  return `
DJUPGÅENDE GEO-RAPPORT FÖR: ${url}

FRÅGA: Hur bedöms sajtens auktoritet och trovärdighet för AI-modeller?
SVAR: AI väljer gärna källor som tydligt visar vem som står bakom innehållet (Om oss, kontakt, team), varför ni är experter (erfarenhet, case, certifieringar) och som har externa trovärdighetssignaler (omnämnanden/backlinks). Förstärk E-E-A-T: lägg till författare, datum, uppdateringar och bevis.
SCORE: 6/10

FRÅGA: Är innehållet optimerat för citeringar i generativa svar (ChatGPT/Grok)?
SVAR: Gör innehållet “citatvänligt”: korta tydliga svar, punktlistor, definitioner, tabeller och FAQ. Lägg gärna in källor eller referenser. Ha 3–5 block per sida som AI kan plocka rakt av: “Nyckelpunkter”, “Kort svar”, “Checklista”.
SCORE: 7/10

FRÅGA: Hur väl matchar innehållet användarens sökintent (relevans)?
SVAR: Varje sida ska lösa en specifik fråga. Besvara pris, process, leveranstid, vanliga problem, vanliga misstag och jämförelser. Ju bättre sidan speglar intent, desto större chans att bli vald i AI-svar och featured snippets.
SCORE: 7/10

FRÅGA: Finns korrekt struktur och teknisk märkning (Schema/semantik) för AI-botar?
SVAR: Tydlig H1/H2/H3, interna länkar och logisk struktur hjälper både Google och AI. Implementera Schema.org JSON-LD: Organization + WebSite + FAQPage (och Service/Product där relevant). Det gör det lättare för AI att förstå kontext och relationer.
SCORE: 6/10

FRÅGA: Är innehållet unikt nog för att AI ska välja er som källa?
SVAR: Unikhet kommer från egna exempel, egna bilder, egen data, jämförelser, före/efter och konkreta rekommendationer. Lägg till “vanliga fel”, “så gör du”, checklistor och tydliga råd. AI föredrar källor som tillför något som inte är generiskt.
SCORE: 7/10

KONKRET STRATEGIPLAN (nästa 30 dagar):
1) Lägg till FAQ (5–10 frågor) på de 5 viktigaste sidorna.
2) Lägg till 3–5 “citatblock” per sida: Nyckelpunkter, Kort svar, Steg-för-steg, Checklista.
3) Implementera JSON-LD: Organization + WebSite + FAQPage (+ Service/Product där relevant).
4) Skapa 1–2 guider (“pillar pages”) som svarar på hela ämnen och internlänka från alla relevanta sidor.
5) Bygg 5–10 relevanta omnämnanden/backlinks (partners, kataloger, branschlistor, PR).
`.trim();
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    hasXaiKey: Boolean(XAI_API_KEY),
    model: XAI_MODEL,
    marker: "FALLBACK-IGAR-5Q" // ✅ så du ser att rätt fil kör
  });
});

app.post("/analyze", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const url = (req.body?.url || "").trim();

  // Cloudflare-delen (mock)
  const cfData = {
    protocol: "HTTP/3",
    security: "WAF Aktiv",
    edge: "Edge Active",
    ssl: "TLS 1.3"
  };

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({
      cfData,
      geoAnalysis: "❌ Ogiltig URL. Exempel: https://example.com"
    });
  }

  if (!XAI_API_KEY) {
    return res.status(500).json({
      cfData,
      geoAnalysis: "❌ XAI_API_KEY saknas i .env. Lägg till den och starta om servern."
    });
  }

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Du är en expert på SEO och GEO (Generative Engine Optimization). Svara på svenska. För varje GEO-pelare (Auktoritet, Citeringar, Relevans, Struktur, Unikhet) ska du presentera: 1) FRÅGA 2) SVAR (utförligt) 3) SCORE (1-10). Avsluta med en konkret strategiplan."
          },
          {
            role: "user",
            content: `Gör en djupgående GEO-analys för webbplatsen ${url} på svenska.`
          }
        ]
      })
    });

    const raw = await response.text();

    let data = null;
    try {
      data = JSON.parse(raw);
    } catch {
      // non-json => fallback
      return res.json({ cfData, geoAnalysis: fallbackGeoIgår(url) });
    }

    // API error => fallback
    if (!response.ok || data?.error) {
      return res.json({
        cfData,
        geoAnalysis: fallbackGeoIgår(url)
      });
    }

    const aiContent = data?.choices?.[0]?.message?.content?.trim();

    // tomt / för kort => fallback
    if (!aiContent || aiContent.length < 120) {
      return res.json({
        cfData,
        geoAnalysis: fallbackGeoIgår(url)
      });
    }

    // annars: AI-svar
    return res.json({
      cfData,
      geoAnalysis: aiContent
    });
  } catch (_err) {
    return res.json({
      cfData,
      geoAnalysis: fallbackGeoIgår(url)
    });
  }
});

app.listen(8888, "127.0.0.1", () => {
  console.log("🚀 SEO/GEO-SERVER KÖR PÅ http://127.0.0.1:8888");
  console.log("✅ Health: http://127.0.0.1:8888/health");
  console.log("🤖 Model:", XAI_MODEL);
  console.log("🔎 Marker: FALLBACK-IGAR-5Q");
});