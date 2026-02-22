const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/analyze', async (req, res) => {
    const { url } = req.body;

    try {
        console.log(`Analyserar: ${url}...`);

        // 1. Google PageSpeed (Teknisk SEO)
        const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&category=PERFORMANCE&key=${process.env.GOOGLE_PAGESPEED_KEY}`;
        const psiRes = await fetch(psiUrl);
        const psiData = await psiRes.json();
        const score = psiData.lighthouseResult?.categories?.performance?.score * 100 || "N/A";

        // 2. Tavily (GEO & AI-sök)
        const tavilyRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query: `Vad säger AI och nätet om bolaget på denna URL: ${url}? Vilka sökord förknippas de med?`,
                search_depth: "advanced",
                include_answer: true
            })
        });
        const tavilyData = await tavilyRes.json();
        const tavilyAnswer = tavilyData.answer || "Ingen data hittades via AI-sök just nu.";

        // 3. Gemini (Analysen)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        
        const prompt = {
            contents: [{
                parts: [{ text: `
                    Gör en SEO & GEO analys för: ${url}
                    DATA FRÅN GOOGLE: Teknisk poäng är ${score}/100.
                    DATA FRÅN TAVILY: ${tavilyAnswer}
                    
                    Skriv en rapport på svenska:
                    1. SEO Status: Hur mår sajten tekniskt?
                    2. AI Synlighet: Hur uppfattas bolaget av en LLM (som ChatGPT)?
                    3. Nyckelfrågor: Vilka frågor besvarar detta bolag bäst på nätet?
                    4. Action: Ge 3 konkreta tips för att förbättra GEO.
                ` }]
            }]
        };

        const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prompt)
        });
        const geminiData = await geminiRes.json();
        const finalAnalysis = geminiData.candidates[0].content.parts[0].text;

        res.json({
            url,
            seoScore: Math.round(score),
            geoAnalysis: finalAnalysis
        });

    } catch (error) {
        console.error("Fel:", error);
        res.status(500).json({ error: "Något gick fel vid analysen." });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server körs på http://localhost:${PORT}`));