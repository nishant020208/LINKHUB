/**
 * imap-sync: connects over TLS to user's IMAP server, authenticates with
 * stored credentials, and syncs recent inbox messages.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { loadAccountWithToken } from '../_shared/token-refresh.ts';
import {
  CORS_HEADERS,
  StreamContext,
  StreamResult,
  NormalizedItem,
  runStream,
  finalizeAccount,
} from '../_shared/sync-helpers.ts';

interface ParsedHeader {
  subject: string;
  from: string;
  date: string;
  messageId: string;
}

function parseHeaders(raw: string): ParsedHeader {
  const result: ParsedHeader = { subject: '(No subject)', from: 'Unknown sender', date: '', messageId: '' };
  const lines = raw.split(/\r?\n/);
  let currentKey = '';
  let currentValue = '';

  const commitField = () => {
    if (!currentKey) return;
    const lower = currentKey.toLowerCase();
    const val = currentValue.trim();
    if (lower === 'subject') result.subject = val || '(No subject)';
    else if (lower === 'from') result.from = val || 'Unknown sender';
    else if (lower === 'date') result.date = val;
    else if (lower === 'message-id') result.messageId = val;
  };

  for (const line of lines) {
    if (/^\s+/.test(line)) {
      currentValue += ' ' + line.trim();
    } else {
      commitField();
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        currentKey = match[1];
        currentValue = match[2];
      } else {
        currentKey = '';
        currentValue = '';
      }
    }
  }
  commitField();
  return result;
}

class ImapClient {
  private conn: Deno.TlsConn | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private tagIndex = 1;
  private buffer = '';

  async connect(host: string, port: number, timeoutMs = 15000): Promise<void> {
    const connPromise = Deno.connectTls({ hostname: host, port });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Connection to ${host}:${port} timed out after ${timeoutMs}ms`)), timeoutMs)
    );
    this.conn = await Promise.race([connPromise, timeoutPromise]);
    this.reader = this.conn.readable.getReader();
    this.writer = this.conn.writable.getWriter();

    // Read initial greeting
    const greeting = await this.readLine();
    if (!greeting.includes('OK')) {
      throw new Error(`IMAP server rejected connection greeting: ${greeting}`);
    }
  }

  async sendCommand(cmd: string): Promise<{ tag: string; response: string; ok: boolean }> {
    if (!this.writer) throw new Error('Not connected');
    const tag = `A${String(this.tagIndex++).padStart(3, '0')}`;
    const payload = new TextEncoder().encode(`${tag} ${cmd}\r\n`);
    await this.writer.write(payload);

    let fullResponse = '';
    while (true) {
      const line = await this.readLine();
      fullResponse += line + '\n';
      if (line.startsWith(`${tag} `)) {
        const ok = line.startsWith(`${tag} OK`);
        return { tag, response: fullResponse, ok };
      }
    }
  }

  private async readLine(): Promise<string> {
    if (!this.reader) throw new Error('Not connected');
    while (!this.buffer.includes('\n')) {
      const { value, done } = await this.reader.read();
      if (done) throw new Error('IMAP connection closed unexpectedly by server');
      this.buffer += new TextDecoder().decode(value);
    }
    const idx = this.buffer.indexOf('\n');
    const line = this.buffer.slice(0, idx).replace(/\r$/, '');
    this.buffer = this.buffer.slice(idx + 1);
    return line;
  }

  async close(): Promise<void> {
    try {
      if (this.writer) {
        await this.sendCommand('LOGOUT').catch(() => {});
      }
    } finally {
      try {
        this.conn?.close();
      } catch {}
    }
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const { accountId } = await req.json().catch(() => ({}));
    if (!accountId) {
      return new Response(JSON.stringify({ error: 'accountId is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { account, token, errorResponse } = await loadAccountWithToken(admin, accountId);
    if (errorResponse || !account || !token) {
      return new Response(JSON.stringify(errorResponse ?? { error: 'Account load failed' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const host = token.extra?.imap_host;
    const port = parseInt(token.extra?.imap_port || '993', 10);
    const user = token.extra?.imap_user || account.email;
    const password = token.accessToken;

    if (!host || !user || !password) {
      await admin
        .from('connected_accounts')
        .update({ status: 'error', error_message: 'Incomplete IMAP credentials: needs reconnect' })
        .eq('id', account.id);

      return new Response(
        JSON.stringify({
          error: 'Incomplete IMAP configuration: host, user, and password are required',
          needsReconnect: true,
        }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const ctx: StreamContext = {
      admin,
      accountId: account.id,
      userId: account.user_id,
      accessToken: password,
      grantedScopes: [],
    };

    const results: StreamResult[] = [];

    // ------------------------------------------------------------- MESSAGES STREAM
    results.push(
      await runStream(ctx, 'messages', 'imap', async (): Promise<NormalizedItem[]> => {
        const client = new ImapClient();
        try {
          await client.connect(host, port);
        } catch (connErr) {
          const errMsg = connErr instanceof Error ? connErr.message : String(connErr);
          await admin
            .from('connected_accounts')
            .update({ status: 'error', error_message: `Connection failed: ${errMsg}. Needs reconnect.` })
            .eq('id', account.id);
          throw new Error(`Could not connect to IMAP server ${host}:${port}: ${errMsg}`);
        }

        try {
          // Authenticate
          const loginRes = await client.sendCommand(`LOGIN "${user.replace(/"/g, '\\"')}" "${password.replace(/"/g, '\\"')}"`);
          if (!loginRes.ok) {
            await admin
              .from('connected_accounts')
              .update({ status: 'error', error_message: 'IMAP Authentication rejected: invalid credentials. Needs reconnect.' })
              .eq('id', account.id);
            throw new Error(`IMAP LOGIN authentication failed: ${loginRes.response}`);
          }

          // Select INBOX
          const selectRes = await client.sendCommand('SELECT INBOX');
          if (!selectRes.ok) {
            throw new Error(`Failed to select INBOX: ${selectRes.response}`);
          }

          // Extract total message count
          const existsMatch = selectRes.response.match(/\*\s+(\d+)\s+EXISTS/i);
          const totalMessages = existsMatch ? parseInt(existsMatch[1], 10) : 0;

          if (totalMessages === 0) {
            await client.close();
            return [];
          }

          // Fetch the latest 25 messages
          const startSeq = Math.max(1, totalMessages - 24);
          const fetchCmd = `FETCH ${startSeq}:${totalMessages} (UID RFC822.SIZE BODY.PEEK[HEADER.FIELDS (SUBJECT FROM DATE MESSAGE-ID)] BODY.PEEK[TEXT]<0.400>)`;
          const fetchRes = await client.sendCommand(fetchCmd);

          await client.close();

          // Parse response entries
          const items: NormalizedItem[] = [];
          const chunks = fetchRes.response.split(/(?=\*\s+\d+\s+FETCH)/g);

          for (const chunk of chunks) {
            if (!chunk.trim() || !chunk.includes('FETCH')) continue;

            const uidMatch = chunk.match(/UID\s+(\d+)/i);
            const uid = uidMatch ? uidMatch[1] : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

            // Extract header block inside {size}\r\n
            const headerBlockMatch = chunk.match(/BODY\[HEADER[^\]]*\]\s*\{(?:\d+)\}\r?\n([\s\S]*?)(?=\r?\n\)\r?\n|\r?\nBODY|\r?\n\*\s+\d+)/i);
            const headerText = headerBlockMatch ? headerBlockMatch[1] : chunk;
            const parsed = parseHeaders(headerText);

            // Extract text preview
            const textMatch = chunk.match(/BODY\[TEXT\](?:<\d+>)?\s*\{(?:\d+)\}\r?\n([\s\S]*?)(?=\r?\n\)\r?\n|\r?\n\*\s+\d+|$)/i);
            const snippet = textMatch ? textMatch[1].slice(0, 300).trim() : '';

            let receivedDate: Date | null = null;
            if (parsed.date) {
              const d = new Date(parsed.date);
              if (!isNaN(d.getTime())) receivedDate = d;
            }

            items.push({
              source: 'imap',
              sourceId: `imap-${uid}`,
              type: 'message',
              title: parsed.subject,
              description: snippet ? `${parsed.from}: ${snippet}` : `From: ${parsed.from}`,
              contentText: snippet,
              contentHtml: `<p><strong>From:</strong> ${parsed.from}</p><p><strong>Subject:</strong> ${parsed.subject}</p><hr/><p>${snippet}</p>`,
              dueAt: undefined,
              priorityScore: 60,
              priority: 'normal',
              isDone: false,
              rawMetadata: {
                uid,
                from: parsed.from,
                date: parsed.date,
                messageId: parsed.messageId,
              },
            });
          }

          return items;
        } catch (procErr) {
          await client.close().catch(() => {});
          throw procErr;
        }
      })
    );

    const totalUpserted = await finalizeAccount(admin, account.id, results);

    return new Response(
      JSON.stringify({
        success: true,
        totalUpserted,
        streams: results,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[imap-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
