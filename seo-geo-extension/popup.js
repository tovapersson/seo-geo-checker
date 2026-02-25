// ⚠️ Ersätt DIN_NYCKEL_HÄR med din Anthropic API-nyckel:
const ANTHROPIC_API_KEY = "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";

function scoreClass(s) {
  if (s >= 8) return 'good';
  if (s >= 6) return 'mid';
  return 'low';
}

function toggleBody(el) {
  el.nextElementSibling.classList.toggle('open');
}

async function runAnalysis() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url || !url.startsWith('http')) {
    showError('Please enter a valid URL starting with https://');
    return;
  }
  if (ANTHROPIC_API_KEY === 'DIN_NYCKEL_HÄR') {
    showError('Add your Anthropic API key in popup.js first.');
    return;
  }

  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('loading').classList.add('show');
  document.getElementById('results').classList.remove('show');
  document.getElementById('resultsHeader').classList.remove('show');
  document.getElementById('errorMsg').classList.remove('show');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are an expert in SEO and GEO (Generative Engine Optimization). Analyze the website: ${url}

Return ONLY valid JSON, nothing else:
{
  "pillars": [
    { "name": "Authority", "question": "How is the site's authority perceived by AI?", "answer": "2-3 sentence analysis", "score": 7 },
    { "name": "Citations", "question": "Is the content optimized for citations in generative answers?", "answer": "2-3 sentence analysis", "score": 7 },
    { "name": "Relevance", "question": "How well does the content match user search intent?", "answer": "2-3 sentence analysis", "score": 7 },
    { "name": "Structure", "question": "Is there proper structure and schema markup for AI bots?", "answer": "2-3 sentence analysis", "score": 7 },
    { "name": "Uniqueness", "question": "Is the content unique enough for AI to choose as a source?", "answer": "2-3 sentence analysis", "score": 7 }
  ],
  "strategy": "1. First action\n2. Second action\n3. Third action\n4. Fourth action\n5. Fifth action"
}`
        }]
      })
    });

    const data = await response.json();
    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    renderResults(url, parsed);

  } catch (err) {
    showError('Something went wrong. Check your API key and try again.');
  } finally {
    btn.disabled = false;
    document.getElementById('loading').classList.remove('show');
  }
}

function renderResults(url, data) {
  try {
    document.getElementById('urlLabel').textContent = new URL(url).hostname;
  } catch { document.getElementById('urlLabel').textContent = url; }

  const avg = data.pillars.reduce((a, b) => a + b.score, 0) / data.pillars.length;
  document.getElementById('geoScore').textContent = `GEO Score: ${avg.toFixed(1)}/10`;
  document.getElementById('resultsHeader').classList.add('show');

  const container = document.getElementById('results');
  container.innerHTML = '';

  data.pillars.forEach((p, i) => {
    const cls = scoreClass(p.score);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header" onclick="toggleBody(this)">
        <div class="card-left">
          <div class="card-pillar">${p.name}</div>
          <div class="card-question">${p.question}</div>
        </div>
        <div class="score-badge ${cls}">${p.score}/10</div>
      </div>
      <div class="score-bar-wrap">
        <div class="score-bar ${cls}" style="width:0%"></div>
      </div>
      <div class="card-body">
        <p>${p.answer}</p>
      </div>
    `;
    container.appendChild(card);
    setTimeout(() => {
      card.querySelector('.score-bar').style.width = p.score * 10 + '%';
    }, 100 + i * 80);
  });

  if (data.strategy) {
    const stratCard = document.createElement('div');
    stratCard.className = 'strategy-box';
    stratCard.innerHTML = `
      <div class="strategy-header" onclick="toggleBody(this)">
        <div class="strategy-title">Your Next Steps</div>
        <div class="strategy-badge">Action Plan</div>
      </div>
      <div class="strategy-body">
        <p>${data.strategy}</p>
      </div>
    `;
    container.appendChild(stratCard);
  }

  container.classList.add('show');
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {
  // Auto-fill current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.url?.startsWith('http')) {
      document.getElementById('urlInput').value = tabs[0].url;
    }
  });

  document.getElementById('analyzeBtn').addEventListener('click', runAnalysis);
  document.getElementById('urlInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') runAnalysis();
  });
});