/**
 * Zuteiler - Worker API
 *
 * Serves /api/* and hands everything else to the static assets (public/).
 * Storage: Cloudflare D1 (binding DB). Passwords are never stored in plain text
 * (PBKDF2-SHA256), session tokens are only stored as SHA-256 hashes.
 */

// Admin address that gets a mail every time someone new joins a room.
const ADMIN_EMAIL = "jathu733@gmail.com";

const MIN_PASSWORD = 4;     // at least 4 characters
const MAX_PASSWORD = 100;
const MAX_NAME = 20;
const MIN_PLAYERS = 3;      // a draw needs at least this many people
const MAX_PLAYERS = 40;
const PBKDF2_ITERATIONS = 100000; // Workers' maximum for PBKDF2
const LOCK_AFTER_FAILS = 8;       // wrong passwords before a name is locked
const LOCK_MINUTES = 5;

// 32 characters, no 0/O/1/I so codes are easy to read out loud.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_PATTERN = /^[A-Z2-9]{6}$/;

// ---------------------------------------------------------------- helpers

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const fail = (status, error) => json({ error }, status);

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex) =>
  Uint8Array.from(hex.match(/../g).map((h) => parseInt(h, 16)));

const randomHex = (bytes) => toHex(crypto.getRandomValues(new Uint8Array(bytes)));

function randomCode(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return toHex(digest);
}

async function derivePassword(password, saltHex) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  return toHex(bits);
}

function sameText(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function shuffle(items) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function cleanName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
}

function validPassword(value) {
  return typeof value === "string" && value.length >= MIN_PASSWORD && value.length <= MAX_PASSWORD;
}

async function authenticate(request, env, code) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  return env.DB.prepare(
    "SELECT * FROM participants WHERE room_code = ? AND token_hash = ?"
  )
    .bind(code, await sha256Hex(token))
    .first();
}

/** Fire-and-forget mail to the admin via Resend (https://resend.com, free tier). */
function notifyAdmin(env, ctx, { code, name, isHost, count }) {
  if (!env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set - admin mail skipped");
    return;
  }
  const subject = `Zuteiler: ${name} ${isHost ? "created" : "joined"} room ${code}`;
  const text = [
    `${name} ${isHost ? "created the room" : "joined the room"} ${code}.`,
    `Players in the room now: ${count}`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");

  ctx.waitUntil(
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        // onboarding@resend.dev works without a domain, but Resend only delivers
        // to the address of your Resend account. Replace with your own domain later.
        from: "Zuteiler <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject,
        text,
      }),
    })
      .then(async (res) => {
        if (!res.ok) console.error("Resend error", res.status, await res.text());
      })
      .catch((err) => console.error("Resend request failed", err))
  );
}

async function countPlayers(env, code) {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM participants WHERE room_code = ?"
  )
    .bind(code)
    .first();
  return row?.n ?? 0;
}

// ---------------------------------------------------------------- handlers

async function createRoom(request, env, ctx) {
  const body = await readBody(request);
  const name = cleanName(body.name);
  if (!name) return fail(400, "nameRequired");
  if (!validPassword(body.password)) return fail(400, "passwordShort");

  let code = null;
  for (let attempt = 0; attempt < 5 && !code; attempt++) {
    const candidate = randomCode(6);
    const taken = await env.DB.prepare("SELECT 1 AS x FROM rooms WHERE code = ?")
      .bind(candidate)
      .first();
    if (!taken) code = candidate;
  }
  if (!code) return fail(503, "serverError");

  const now = Date.now();
  const token = randomHex(32);
  const salt = randomHex(16);
  const passHash = await derivePassword(body.password, salt);

  await env.DB.batch([
    env.DB.prepare("INSERT INTO rooms (code, status, created_at) VALUES (?, 'open', ?)").bind(code, now),
    env.DB.prepare(
      `INSERT INTO participants
         (room_code, name, name_key, pass_salt, pass_hash, token_hash, is_host, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    ).bind(code, name, name.toLowerCase(), salt, passHash, await sha256Hex(token), now),
  ]);

  notifyAdmin(env, ctx, { code, name, isHost: true, count: 1 });
  return json({ code, token, name, isHost: true }, 201);
}

async function joinRoom(request, env, ctx, code) {
  const body = await readBody(request);
  const name = cleanName(body.name);
  if (!name) return fail(400, "nameRequired");
  if (!validPassword(body.password)) return fail(400, "passwordShort");

  const room = await env.DB.prepare("SELECT status FROM rooms WHERE code = ?").bind(code).first();
  if (!room) return fail(404, "roomNotFound");

  const existing = await env.DB.prepare(
    "SELECT * FROM participants WHERE room_code = ? AND name_key = ?"
  )
    .bind(code, name.toLowerCase())
    .first();

  // Returning person: same name + password logs them back in.
  if (existing) {
    const now = Date.now();
    if (existing.locked_until > now) return fail(429, "locked");

    const hash = await derivePassword(body.password, existing.pass_salt);
    if (!sameText(hash, existing.pass_hash)) {
      await env.DB.prepare(
        `UPDATE participants
            SET failed = failed + 1,
                locked_until = CASE WHEN failed + 1 >= ? THEN ? ELSE 0 END
          WHERE id = ?`
      )
        .bind(LOCK_AFTER_FAILS, now + LOCK_MINUTES * 60_000, existing.id)
        .run();
      return fail(401, "wrongPassword");
    }

    const token = randomHex(32);
    await env.DB.prepare(
      "UPDATE participants SET token_hash = ?, failed = 0, locked_until = 0 WHERE id = ?"
    )
      .bind(await sha256Hex(token), existing.id)
      .run();
    return json({ code, token, name: existing.name, isHost: !!existing.is_host });
  }

  // New person: only allowed while the room has not been drawn yet.
  if (room.status !== "open") return fail(409, "alreadyDrawn");
  if ((await countPlayers(env, code)) >= MAX_PLAYERS) return fail(409, "roomFull");

  const token = randomHex(32);
  const salt = randomHex(16);
  const passHash = await derivePassword(body.password, salt);
  try {
    await env.DB.prepare(
      `INSERT INTO participants
         (room_code, name, name_key, pass_salt, pass_hash, token_hash, is_host, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    )
      .bind(code, name, name.toLowerCase(), salt, passHash, await sha256Hex(token), Date.now())
      .run();
  } catch {
    // Lost a race with someone who took the same name a moment ago.
    return fail(409, "nameTaken");
  }

  const count = await countPlayers(env, code);
  notifyAdmin(env, ctx, { code, name, isHost: false, count });
  return json({ code, token, name, isHost: false }, 201);
}

async function getRoom(request, env, code) {
  const room = await env.DB.prepare("SELECT code, status FROM rooms WHERE code = ?")
    .bind(code)
    .first();
  if (!room) return fail(404, "roomNotFound");

  const me = await authenticate(request, env, code);
  if (!me) {
    // Public info only: enough for the join screen.
    return json({ code, status: room.status, exists: true });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, name, is_host FROM participants
      WHERE room_code = ? ORDER BY joined_at, id`
  )
    .bind(code)
    .all();

  // The person's own target is the only assignment ever sent back to them.
  let target = null;
  if (me.target_id) {
    const row = await env.DB.prepare("SELECT name FROM participants WHERE id = ?")
      .bind(me.target_id)
      .first();
    target = row?.name ?? null;
  }

  return json({
    code,
    status: room.status,
    exists: true,
    min: MIN_PLAYERS,
    max: MAX_PLAYERS,
    me: { name: me.name, isHost: !!me.is_host },
    target,
    participants: results.map((p) => ({
      name: p.name,
      isHost: !!p.is_host,
      isMe: p.name.toLowerCase() === me.name_key,
    })),
  });
}

async function drawRoom(request, env, code) {
  const me = await authenticate(request, env, code);
  if (!me) return fail(401, "unauthorized");
  if (!me.is_host) return fail(403, "hostOnly");

  const room = await env.DB.prepare("SELECT status FROM rooms WHERE code = ?").bind(code).first();
  if (!room) return fail(404, "roomNotFound");
  if (room.status === "drawn") return fail(409, "alreadyDrawn");

  const { results } = await env.DB.prepare(
    "SELECT id FROM participants WHERE room_code = ?"
  )
    .bind(code)
    .all();
  if (results.length < MIN_PLAYERS) return fail(409, "notEnough");

  // One big random ring: everybody gives to exactly one person and
  // receives from exactly one person, and nobody gets themselves.
  const order = shuffle(results.map((r) => r.id));
  const statements = order.map((id, i) =>
    env.DB.prepare("UPDATE participants SET target_id = ? WHERE id = ?").bind(
      order[(i + 1) % order.length],
      id
    )
  );
  statements.push(
    env.DB.prepare("UPDATE rooms SET status = 'drawn', drawn_at = ? WHERE code = ?").bind(
      Date.now(),
      code
    )
  );
  await env.DB.batch(statements);
  return json({ ok: true });
}

async function resetRoom(request, env, code) {
  const me = await authenticate(request, env, code);
  if (!me) return fail(401, "unauthorized");
  if (!me.is_host) return fail(403, "hostOnly");

  await env.DB.batch([
    env.DB.prepare("UPDATE participants SET target_id = NULL WHERE room_code = ?").bind(code),
    env.DB.prepare("UPDATE rooms SET status = 'open', drawn_at = NULL WHERE code = ?").bind(code),
  ]);
  return json({ ok: true });
}

// ---------------------------------------------------------------- router

async function route(request, url, env, ctx) {
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "rooms", CODE, action]
  const method = request.method;

  if (parts[0] !== "api" || parts[1] !== "rooms") return fail(404, "notFound");
  if (parts.length === 2 && method === "POST") return createRoom(request, env, ctx);

  const code = (parts[2] || "").toUpperCase();
  if (!CODE_PATTERN.test(code)) return fail(404, "roomNotFound");

  const action = parts[3];
  if (!action && method === "GET") return getRoom(request, env, code);
  if (action === "join" && method === "POST") return joinRoom(request, env, ctx, code);
  if (action === "draw" && method === "POST") return drawRoom(request, env, code);
  if (action === "reset" && method === "POST") return resetRoom(request, env, code);

  return fail(404, "notFound");
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      return await route(request, url, env, ctx);
    } catch (err) {
      console.error(err);
      return fail(500, "serverError");
    }
  },
};
