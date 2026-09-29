/**
 * Cryptographic helpers for AES-256-GCM encryption of stored OAuth refresh tokens.
 * Uses Web Crypto API natively supported in Deno / Supabase Edge runtime.
 */

const getKey = async (secretHex?: string): Promise<CryptoKey> => {
  const secret = secretHex || Deno.env.get('TOKEN_ENCRYPTION_KEY') || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  // Convert 64-char hex string to 32 bytes
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(secret.substring(i * 2, i * 2 + 2) || '00', 16);
  }

  return await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
};

export async function encryptToken(plainText: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  const cipherArray = new Uint8Array(cipherBuffer);
  // Format: ivHex:cipherHex
  const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join('');
  const cipherHex = Array.from(cipherArray).map((b) => b.toString(16).padStart(2, '0')).join('');

  return `${ivHex}:${cipherHex}`;
}

export async function decryptToken(encryptedData: string): Promise<string> {
  const key = await getKey();
  const [ivHex, cipherHex] = encryptedData.split(':');
  if (!ivHex || !cipherHex) throw new Error('Invalid encrypted token format');

  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBytes
  );

  return new TextDecoder().decode(decryptedBuffer);
}
