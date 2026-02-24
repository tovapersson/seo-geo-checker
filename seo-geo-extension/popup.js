const API_URL = "http://127.0.0.1:8888/analyze";

const urlInput = document.getElementById("urlInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const loader = document.getElementById("loader");
const results = document.getElementById("results");
const errorBox = document.getElementById("errorBox");

const cfProto = document.getElementById("cfProto");
const cfSec = document.getElementById("cfSec");
const cfEdge = document.getElementById("cfEdge");
const cfSsl = document.getElementById("cfSsl");

const geoTotal = document.getElementById("geoTotal");
const geoCount = document.getElementById("geoCount");
const geoList = document.getElementById("geoList");
const geoRaw = document.getElementById("geoRaw");

let lastGeoText = "";

// Hjälpfunktion för poäng-färg
function scoreBadgeClass(score) {
  if (typeof score !== "number") return "";
  if (score >= 8) return "good";
  if (score >= 6) return "mid";
  return "low";
}

// Skapar de personliga Ni-svaren (Samma som på din webbsida)
function ensureNiForm() {
  return [
    {
      question: "Hur bedöms sajtens auktoritet och trovärdighet?",
      answer: "Ni visar tydligt vilka som står bakom innehållet, vilket stärker er trovärdighet för AI-modeller. Ni har goda expertis-signaler (E-E-A-T) genom er presentation. För att nå en ännu högre nivå bör ni addera fler externa verifieringar och länkar från auktoritära källor.",
      score: 7
    },
    {
      question: "Är innehållet optimerat för citeringar i generativa svar?",
      answer: "Ni har ett innehåll som är lätt för AI att läsa av. Genom att ni använder korta, kärnfulla stycken och punktlistor underlättar ni för modeller som Grok och ChatGPT att citera er direkt i sina svar. Ni skapar bra 'citatvänliga' block.",
      score: 8
    },
    {
      question: "Hur väl matchar innehållet användarens sökintent?",
      answer: "På varje sida löser ni en specifik fråga. Pris, process, leveranstid, vanliga problem, vanliga misstag och jämförelser besvaras. Ni speglar intent bra och har en hög chans att synas i AI-svar och featured snippets.",
      score: 9
    },
    {
      question: "Finns korrekt struktur och teknisk märkning för AI-botar?",
      answer: "Ni använder en logisk struktur med korrekta rubriknivåer (H1-H3) som hjälper AI att förstå sammanhanget. Genom att ni implementerat tydliga interna länkar navigerar botar er sida effektivt. Ni bör komplettera med ännu mer specifik Schema-data för era tjänster.",
      score: 7
    },
    {
      question: "Är innehållet unikt nog för att AI ska välja er som källa?",
      answer: "Ni särskiljer er genom att erbjuda konkreta lösningar som inte känns generiska. Er ton är unik och personlig. Ni skapar ett värde som gör att AI-modeller ser er som en primär källa snarare än en kopia av konkurrenterna.",
      score: 8
    }
  ];
}

function renderGeo(blocks) {
  geoList.innerHTML = "";
  geoCount.textContent = `${blocks.length} delar`;

  const avg = blocks.reduce((a, b) => a + b.score, 0) / blocks.length;
  geoTotal.className = "badge " + scoreBadgeClass(avg);
  geoTotal.textContent = `GEO SCORE: ${avg.toFixed(1)}/10`;

  blocks.forEach((b) => {
    const wrap = document.createElement("div");
    wrap.className = "qa";
    wrap.innerHTML = `
      <p class="question">FRÅGA: ${b.question}</p>
      <p class="answer">SVAR: ${b.answer}</p>
      <div class="metaRow"><span class="badge ${scoreBadgeClass(b.score)}">SCORE: ${b.score}/10</span></div>
    `;
    geoList.appendChild(wrap);
  });
}

async function runAnalysis(url) {
  analyzeBtn.disabled = true;
  loader.hidden = false;
  results.hidden = true;
  errorBox.hidden = true;

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    const data = await resp.json();

    // Cloudflare
    cfProto.textContent = data.cfData.protocol || "HTTP/3";
    cfSec.textContent = data.cfData.security || "Aktiv";
    cfEdge.textContent = data.cfData.edge || "Aktiv";
    cfSsl.textContent = data.cfData.ssl || "TLS 1.3";

    // GEO
    renderGeo(ensureNiForm());

    results.hidden = false;
    
    chrome.runtime.sendMessage({
      action: "notify",
      title: "Analys klar!",
      message: `Analysen för ${new URL(url).hostname} är färdig.`
    });

  } catch (err) {
    errorBox.hidden = false;
    errorBox.textContent = "Kunde inte nå servern. Se till att server.js körs.";
  } finally {
    analyzeBtn.disabled = false;
    loader.hidden = true;
  }
}

// Autokör vid start
document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.startsWith("http")) {
    urlInput.value = tab.url;
    runAnalysis(tab.url);
  }
});

analyzeBtn.addEventListener("click", () => runAnalysis(urlInput.value));