/**
 * provider-status: returns, for every provider, whether its required Supabase
 * secrets are present. This lets the Integrations page show a real
 * "Not configured" state and refuse to call anything when clicked, instead of
 * failing into a generic Edge Function error.
 *
 * Never returns secret values — only booleans and the names of what's missing.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { PROVIDER_SPECS, missingEnv } from '../_shared/providers.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const providers: Record<string, { configured: boolean; auth: string; missing: string[] }> = {};
  for (const [key, spec] of Object.entries(PROVIDER_SPECS)) {
    const missing = missingEnv(key);
    providers[key] = { configured: missing.length === 0, auth: spec.auth, missing };
  }

  return new Response(JSON.stringify({ providers }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
