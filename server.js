import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envFile = readFileSync(join(__dirname, '.env'), 'utf8');
for (const line of envFile.split('\n')) {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
}

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// The DATAFORSEO_PASSWORD env var is already base64-encoded login:password
const AUTH = process.env.DATAFORSEO_PASSWORD;

async function dfsPost(endpoint, body) {
  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${AUTH}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Get top 10 ranked keywords for a domain
app.post('/api/ranked-keywords', async (req, res) => {
  try {
    const { domain, country, language } = req.body;
    const data = await dfsPost('dataforseo_labs/google/ranked_keywords/live', [{
      target: domain,
      location_name: country,
      language_code: language || 'en',
      limit: 10,
      order_by: ['ranked_serp_element.serp_item.rank_group,asc'],
      filters: [['ranked_serp_element.serp_item.type', '=', 'organic']],
    }]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get AI Overview rankings for a domain
app.post('/api/ai-overview-keywords', async (req, res) => {
  try {
    const { domain, country, language } = req.body;
    const data = await dfsPost('dataforseo_labs/google/ranked_keywords/live', [{
      target: domain,
      location_name: country,
      language_code: language || 'en',
      limit: 10,
      item_types: ['ai_overview_reference'],
      order_by: ['keyword_data.keyword_info.search_volume,desc'],
    }]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get LLM mentions (ChatGPT platform)
app.post('/api/llm-mentions-chatgpt', async (req, res) => {
  try {
    const { domain, country, language } = req.body;
    const data = await dfsPost('content_analysis/ai_optimization/llm_mentions/search/live', [{
      target: [{ domain, search_filter: 'include', search_scope: ['answer'] }],
      platform: 'chat_gpt',
      location_name: country || 'United States',
      language_code: language || 'en',
      limit: 10,
      order_by: ['ai_search_volume,desc'],
    }]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get LLM mentions (Google/Gemini platform)
app.post('/api/llm-mentions-google', async (req, res) => {
  try {
    const { domain, country, language } = req.body;
    const data = await dfsPost('content_analysis/ai_optimization/llm_mentions/search/live', [{
      target: [{ domain, search_filter: 'include', search_scope: ['answer'] }],
      platform: 'google',
      location_name: country || 'United States',
      language_code: language || 'en',
      limit: 10,
      order_by: ['ai_search_volume,desc'],
    }]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get aggregate LLM metrics (ChatGPT)
app.post('/api/llm-aggregate-chatgpt', async (req, res) => {
  try {
    const { domain, country, language } = req.body;
    const data = await dfsPost('content_analysis/ai_optimization/llm_mentions/aggregate_metrics/live', [{
      target: [{ domain, search_filter: 'include', search_scope: ['answer'] }],
      platform: 'chat_gpt',
      location_name: country || 'United States',
      language_code: language || 'en',
    }]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get aggregate LLM metrics (Google/Gemini)
app.post('/api/llm-aggregate-google', async (req, res) => {
  try {
    const { domain, country, language } = req.body;
    const data = await dfsPost('content_analysis/ai_optimization/llm_mentions/aggregate_metrics/live', [{
      target: [{ domain, search_filter: 'include', search_scope: ['answer'] }],
      platform: 'google',
      location_name: country || 'United States',
      language_code: language || 'en',
    }]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get top pages mentioned in LLMs
app.post('/api/llm-top-pages', async (req, res) => {
  try {
    const { domain, platform, country, language } = req.body;
    const data = await dfsPost('content_analysis/ai_optimization/llm_mentions/top_pages/live', [{
      target: [{ domain, search_filter: 'include', search_scope: ['answer'] }],
      platform: platform || 'chat_gpt',
      location_name: country || 'United States',
      language_code: language || 'en',
      items_list_limit: 10,
      internal_list_limit: 5,
    }]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Query Perplexity directly for domain mentions
app.post('/api/perplexity-check', async (req, res) => {
  try {
    const { domain } = req.body;
    const data = await dfsPost('content_analysis/ai_optimization/llm_response/live', [{
      llm_type: 'perplexity',
      model_name: 'sonar',
      user_prompt: `What is ${domain} and what services or products do they offer? Include their website URL in your answer.`,
      web_search: true,
    }]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3456;
app.listen(PORT, () => {
  console.log(`AI Visibility Checker running at http://localhost:${PORT}`);
});
