// Shared axios instance for every gateway->Django call — the sole
// integration point between the two services (only routes/prediction.js
// imports this). Carries the internal service key on every request so
// Django's InternalApiKeyMiddleware (amr_project/middleware.py) can
// reject anything that didn't come through this gateway.
const axios = require('axios');

// Worst-case Django-side chains this has to cover: /predict and
// /extract-report each run a CatBoost/PDF-parsing step (a few seconds at
// most) plus one Gemini call (bounded to 20s — see ai_insights.py /
// extract_report_llm.py's GEMINI_TIMEOUT_SECONDS, which is intentionally
// kept comfortably under this value so a slow Gemini call surfaces as a
// clean Django-level fallback rather than this timeout firing first and
// masking what actually happened); /research-papers makes two sequential
// PubMed calls, each already capped at 8s in pubmed_client.py (~16s worst
// case). 30s covers either path with real margin for network/process
// overhead, while still failing well before a user would assume the
// request is simply hung forever (axios defaults to no timeout at all).
const DJANGO_REQUEST_TIMEOUT_MS = 30 * 1000;

const djangoClient = axios.create({
  baseURL: process.env.DJANGO_API_URL,
  timeout: DJANGO_REQUEST_TIMEOUT_MS,
  headers: {
    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY,
  },
});

module.exports = djangoClient;
