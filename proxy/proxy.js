openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=US/ST=Denial/L=Springfield/O=Dis/CN=localhost"

# 2. HTTPS Bun Proxy
import { serve } from 'bun';

const JUNK_PARAMS = new Set([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
  'utm_referrer','utm_reader','utm_name','utm_id','utm_group',
  'fbclid','gclid','msclid','mc_cid','igshid','mc_eid',
  'ref','referrer','source','origin','came_from',
  'cid','campaignid','adgroupid','adid','keyword',
  'sessionid','affiliate','aff_id','aff_sub','aff_sub2',
  'token','partner','partner_id','pp','feature','app',
  'ab_channel','list','t','start','time','timestamp',
  'si','s','hs','hss','hssi','hls','_gl','trk','trkCampaign'
]);

serve({
  port: 3000,
  tls: {
    cert: Bun.file('cert.pem'),
    key: Bun.file('key.pem'),
  },
  async fetch(req) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const urlParam = new URL(req.url).searchParams.get('url');
    if (!urlParam) {
      return new Response('Missing ?url=', { status: 400, headers: corsHeaders });
    }

    try {
      let targetUrl = decodeURIComponent(urlParam);
      const urlObj = new URL(targetUrl);
      
      if (urlObj.protocol === 'http:') {
        urlObj.protocol = 'https:';
        targetUrl = urlObj.toString();
        console.log(`🔒 HTTPS upgrade: ${targetUrl}`);
      }

      for (const [key] of urlObj.searchParams) {
        if (JUNK_PARAMS.has(key)) {
          urlObj.searchParams.delete(key);
        }
      }
      
      if (urlObj.hash && /utm_|fbclid|gclid/i.test(urlObj.hash)) {
        urlObj.hash = '';
      }
      
      targetUrl = urlObj.toString();
      console.log(`🧹 Cleaned → ${targetUrl}`);

      const targetRes = await fetch(targetUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (LibreWatch-Privacy/1.0)',
          'Referer': '',
          'DNT': '1'
        }
      });

      const contentType = targetRes.headers.get('content-type') || 'text/plain';
      let data = contentType.includes('application/json') 
        ? await targetRes.json() 
        : await targetRes.text();

      console.log(`✅ HTTPS Proxy OK: ${targetUrl}`);
      
      return new Response(data, {
        status: targetRes.status,
        headers: {
          'Content-Type': contentType,
          'X-Privacy-Proxy': 'LibreWatch-HTTPS-1.0',
          ...corsHeaders
        }
      });
      
    } catch (error) {
      console.error(`❌ Proxy failed: ${error.message}`);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
});

console.log('🚀 HTTPS Proxy @ https://localhost:3000/?url=');
