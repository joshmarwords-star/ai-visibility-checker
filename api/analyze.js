const AUTH = process.env.DATAFORSEO_AUTH;

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain, country, language } = req.body;
  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const lang = language || 'en';
  const loc = country || 'United States';

  try {
    const [ranked, aio, chatgptMentions, geminiMentions, chatgptAgg, geminiAgg, perplexity] = await Promise.allSettled([
      // Top 10 organic keywords
      dfsPost('dataforseo_labs/google/ranked_keywords/live', [{
        target: domain,
        location_name: loc,
        language_code: lang,
        limit: 10,
        order_by: ['ranked_serp_element.serp_item.rank_group,asc'],
        filters: [['ranked_serp_element.serp_item.type', '=', 'organic']],
      }]),
      // AI Overview keywords
      dfsPost('dataforseo_labs/google/ranked_keywords/live', [{
        target: domain,
        location_name: loc,
        language_code: lang,
        limit: 10,
        item_types: ['ai_overview_reference'],
        order_by: ['keyword_data.keyword_info.search_volume,desc'],
      }]),
      // ChatGPT mentions
      dfsPost('content_analysis/ai_optimization/llm_mentions/search/live', [{
        target: [{ domain, search_filter: 'include', search_scope: ['answer'] }],
        platform: 'chat_gpt',
        location_name: loc,
        language_code: lang,
        limit: 10,
        order_by: ['ai_search_volume,desc'],
      }]),
      // Gemini/Google mentions
      dfsPost('content_analysis/ai_optimization/llm_mentions/search/live', [{
        target: [{ domain, search_filter: 'include', search_scope: ['answer'] }],
        platform: 'google',
        location_name: loc,
        language_code: lang,
        limit: 10,
        order_by: ['ai_search_volume,desc'],
      }]),
      // ChatGPT aggregate
      dfsPost('content_analysis/ai_optimization/llm_mentions/aggregate_metrics/live', [{
        target: [{ domain, search_filter: 'include', search_scope: ['answer'] }],
        platform: 'chat_gpt',
        location_name: loc,
        language_code: lang,
      }]),
      // Gemini aggregate
      dfsPost('content_analysis/ai_optimization/llm_mentions/aggregate_metrics/live', [{
        target: [{ domain, search_filter: 'include', search_scope: ['answer'] }],
        platform: 'google',
        location_name: loc,
        language_code: lang,
      }]),
      // Perplexity check
      dfsPost('content_analysis/ai_optimization/llm_response/live', [{
        llm_type: 'perplexity',
        model_name: 'sonar',
        user_prompt: `What is ${domain} and what services or products do they offer? Include their website URL in your answer.`,
        web_search: true,
      }]),
    ]);

    const unwrap = (r) => r.status === 'fulfilled' ? r.value : { error: r.reason?.message || 'Failed' };

    res.status(200).json({
      ranked: unwrap(ranked),
      aio: unwrap(aio),
      chatgptMentions: unwrap(chatgptMentions),
      geminiMentions: unwrap(geminiMentions),
      chatgptAgg: unwrap(chatgptAgg),
      geminiAgg: unwrap(geminiAgg),
      perplexity: unwrap(perplexity),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
