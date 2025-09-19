export interface Env {
  R2: R2Bucket
  MAX_FILE_SIZE: string
  ALLOW_ORIGINS: string
  WORKER_API_KEY?: string
  SUPABASE_JWT_PUBLIC_KEY?: string
}

const ok = (data: unknown, origin = "*") =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: corsHeaders(origin, "application/json")
  })

const bad = (msg: string, status = 400, origin = "*") =>
  new Response(JSON.stringify({ error: msg }), {
    status,
    headers: corsHeaders(origin, "application/json")
  })

function corsHeaders(origin: string, contentType?: string) {
  const h: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization,content-type,x-user-id,x-api-key",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  }
  if (contentType) h["Content-Type"] = contentType
  return h
}

function pickOrigin(req: Request, allowListCsv: string) {
  const allow = allowListCsv.split(",").map(s => s.trim()).filter(Boolean)
  const origin = req.headers.get("origin") || "*"
  if (origin === "*" || allow.length === 0) return "*"
  return allow.includes(origin) ? origin : "https://crapgpt.lol"
}

// very light auth - choose one:
// - X-API-Key header that matches WORKER_API_KEY, or
// - Bearer <Supabase JWT> that verifies against SUPABASE_JWT_PUBLIC_KEY
async function auth(req: Request, env: Env) {
  const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (env.WORKER_API_KEY && apiKey === env.WORKER_API_KEY) {
    const uid = req.headers.get("x-user-id") || "system"
    return { ok: true, userId: uid }
  }
  // Optional: add Supabase JWT verification here if you want true user binding.
  // For now, reject if no match with WORKER_API_KEY.
  return { ok: false, reason: "unauthorised" as const }
}

// POST /r2/upload?key=folder/name.ext&contentType=...
async function handleUpload(req: Request, env: Env, origin: string) {
  const url = new URL(req.url)
  const key = url.searchParams.get("key")?.trim()
  const contentType = url.searchParams.get("contentType") || req.headers.get("content-type") || "application/octet-stream"
  if (!key) return bad("missing key", 400, origin)

  const max = parseInt(env.MAX_FILE_SIZE || "104857600", 10)
  const contentLength = req.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > max) return bad("file too large", 413, origin)

  // Stream request body straight to R2
  await env.R2.put(key, req.body!, {
    httpMetadata: { contentType }
  })

  return ok({ ok: true, key }, origin)
}

// GET /r2/download?key=folder/name.ext
// Streams from R2 to client. Add content-disposition if you want forced download.
async function handleDownload(req: Request, env: Env, origin: string) {
  const url = new URL(req.url)
  const key = url.searchParams.get("key")?.trim()
  if (!key) return bad("missing key", 400, origin)

  const obj = await env.R2.get(key)
  if (!obj) return bad("not found", 404, origin)

  const headers = corsHeaders(origin, obj.httpMetadata?.contentType || "application/octet-stream")
  if (obj.httpMetadata?.contentDisposition) headers["Content-Disposition"] = obj.httpMetadata.contentDisposition
  if (obj.httpMetadata?.cacheControl) headers["Cache-Control"] = obj.httpMetadata.cacheControl
  if (obj.size) headers["Content-Length"] = String(obj.size)

  return new Response(obj.body, { status: 200, headers })
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = pickOrigin(req, env.ALLOW_ORIGINS || "")
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) })

    const u = new URL(req.url)
    if (u.pathname.endsWith("/health")) return ok({ ok: true, time: Date.now() }, origin)

    // All mutating routes require auth
    if (u.pathname.endsWith("/r2/upload")) {
      const a = await auth(req, env)
      if (!a.ok) return bad("unauthorised", 401, origin)
      return handleUpload(req, env, origin)
    }

    if (u.pathname.endsWith("/r2/download")) {
      return handleDownload(req, env, origin)
    }

    return bad("not found", 404, origin)
  }
} satisfies ExportedHandler<Env>;