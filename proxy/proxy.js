/* Install: curl -fsSL https://bun.sh/install | bash */
import { serve } from 'bun';

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url).searchParams.get('url');
    if (!url) return new Response('Missing ?url=', { status: 400 });
    
    const res = await fetch(url);
    const data = await res.json();
    
    return Response.json(data, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
});
