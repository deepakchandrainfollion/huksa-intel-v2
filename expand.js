module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Handle body parsing - Vercel may send raw string or parsed object
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) { body = {}; }
    }
    if (!body || typeof body !== 'object') {
      // Try reading raw body from stream
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      try { body = JSON.parse(raw); } catch(e) { body = {}; }
    }

    let messages;
    const model = body.model || 'claude-haiku-4-5-20251001';
    const max_tokens = body.max_tokens || 6000;

    if (body.messages && Array.isArray(body.messages)) {
      messages = body.messages;
    } else if (body.prompt) {
      messages = [{ role: 'user', content: String(body.prompt) }];
    } else {
      return res.status(400).json({ error: 'No prompt or messages provided', received: Object.keys(body || {}) });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25'
      },
      body: JSON.stringify({ model, max_tokens, messages })
    });

    const data = await response.json();
    if (data.error) console.error('Anthropic API error:', JSON.stringify(data.error));
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
