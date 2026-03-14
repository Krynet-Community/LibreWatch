/* Install: curl -fsSL https://bun.sh/install | bash */
import { serve } from 'bun';

serve({
  port: 3000,
  async fetch(req) {
    // ADD THESE CORS HEADERS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight OPTIONS
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url = new URL(req.url).searchParams.get('url');
    if (!url) {
      return new Response('Missing ?url=', { status: 400, headers: corsHeaders });
    }

    try {
      const targetRes = await fetch(decodeURIComponent(url), {
        headers: { 'User-Agent': 'LibreWatch-Proxy/1.0' }
      });

      const contentType = targetRes.headers.get('content-type') || 'application/json';
      
      let data;
      if (contentType.includes('application/json')) {
        data = await targetRes.json();
      } else {
        data = await targetRes.text();
      }

      return new Response(JSON.stringify(data), {
        status: targetRes.status,
        headers: {
          'Content-Type': contentType,
          ...corsHeaders
        }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
});

console.log('🚀 LibreWatch Proxy on http://localhost:3000');
