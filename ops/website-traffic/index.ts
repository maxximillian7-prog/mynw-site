import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedPaths = new Set(["/","/404/","/button/privacy/","/delete-account/","/family/join/","/manual/","/nowcook/","/nowcook/delete-account/","/nowcook/manual/","/nowcook/privacy/","/nowcook/support/","/nowcook/terms/","/nowgreen/","/nowgreen/ai-data/","/nowgreen/data-rights/","/nowgreen/delete-account/","/nowgreen/manual/","/nowgreen/privacy/","/nowgreen/support/","/nowgreen/terms/","/nowkids/","/nowkids/ai-safety/","/nowkids/child-safety/","/nowkids/community/","/nowkids/data-rights/","/nowkids/delete-account/","/nowkids/manual/","/nowkids/ocr-test/","/nowkids/parents/","/nowkids/permissions/","/nowkids/privacy/","/nowkids/support/","/nowkids/terms/","/nowwhat/","/privacy/","/support/","/terms/","/welcome/"]);
const allowedOrigins = new Set(['https://mynw.app', 'https://www.mynw.app']);
const allowedLocales = new Set(['en','pt','ru','uk','fr','es','de','it','und']);
const allowedSources = new Set(['direct','internal','external','nowwhat','nowcook','nowkids','nowgreen']);
const client = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function response(status: number, origin: string | null, message?: string): Response {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin',
  };
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '3600';
  }
  return new Response(message || null, {
    status,
    headers,
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    return response(origin && allowedOrigins.has(origin) ? 204 : 403, origin);
  }
  if (req.method !== 'POST') return response(405, origin, 'method_not_allowed');
  // Requests must originate from the actual mynw.app browser origin.
  // This blocks ordinary cross-origin scripts but is not authentication;
  // compromised browsers and spoofed headers are out of scope.
  if (!origin || !allowedOrigins.has(origin)) return response(403, origin, 'invalid_origin');
  const agent = req.headers.get('user-agent') || '';
  if (/bot|crawl|spider|slurp|preview|lighthouse|headless|curl|wget/i.test(agent)) {
    return response(204, origin);
  }

  try {
    // No cookies or visitor IDs. Never store IP, UA, full URL, query or referrer.
    const body = await req.text();
    if (body.length > 450) return response(413, origin, 'too_large');
    const data = JSON.parse(body);
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return response(400, origin, 'invalid_payload');
    }
    const path = data.path;
    const lang = data.lang;
    const source = data.source;
    if (typeof path !== 'string' || !allowedPaths.has(path) ||
        typeof lang !== 'string' || !allowedLocales.has(lang) ||
        typeof source !== 'string' || !allowedSources.has(source)) {
      return response(400, origin, 'invalid_dimensions');
    }
    const { error } = await client.rpc('mynw_record_pageview', {
      p_path: path, p_lang: lang, p_source: source,
    });
    if (error) {
      console.error('aggregate_pageview_write_failed', error.code);
      return response(503, origin, 'storage_unavailable');
    }
    return response(204, origin);
  } catch {
    return response(400, origin, 'invalid_payload');
  }
});
