/**
 * HMAC-signed, expiring CSRF state tokens for the OAuth handshake.
 *
 * The payload carries the user id and the provider, so the shared callback URL
 * never needs a `?provider=` query string — the provider is recovered from the
 * verified state alone.
 */

interface StatePayload {
  userId: string;
  provider: string;
  exp: number;
}

function stateSecret(): string {
  // A dedicated secret is preferred; TOKEN_ENCRYPTION_KEY is the safe fallback
  // already required by every other Edge Function.
  return Deno.env.get('STATE_SIGNING_KEY') || Deno.env.get('TOKEN_ENCRYPTION_KEY') || 'unifyhub-default-secret-key-32b!';
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signState(payload: StatePayload): Promise<string> {
  const data = btoa(JSON.stringify(payload));
  const key = await hmacKey(stateSecret());
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${toHex(signature)}`;
}

export async function verifyState(signedState: string): Promise<StatePayload | null> {
  try {
    const [encodedData, sigHex] = signedState.split('.');
    if (!encodedData || !sigHex) return null;

    const key = await hmacKey(stateSecret());
    const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(encodedData)
    );
    if (!isValid) return null;

    const payload = JSON.parse(atob(encodedData)) as StatePayload;
    if (!payload.exp || payload.exp < Date.now() || !payload.provider || !payload.userId) return null;
    return payload;
  } catch (err) {
    console.error('[state] verification exception:', err);
    return null;
  }
}
