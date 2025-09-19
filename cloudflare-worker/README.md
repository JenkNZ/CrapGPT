# CrapGPT R2 Gateway Worker

A secure Cloudflare Worker that provides controlled access to R2 storage without exposing S3 keys to clients.

## Features

- **Secure Upload/Download**: Stream files directly to/from R2 without client-side keys
- **CORS Protection**: Locked to your domain origins
- **Simple Auth**: API key-based authentication
- **Size Limits**: Configurable file size limits (default 100MB)
- **Streaming**: Efficient streaming for large files

## Setup

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Configure Secrets

```bash
# Required: API key for server-to-worker auth
wrangler secret put WORKER_API_KEY

# Optional: Supabase JWT public key for user verification
wrangler secret put SUPABASE_JWT_PUBLIC_KEY
```

### 3. Deploy

```bash
npm install
wrangler deploy
```

## DNS Configuration

In Cloudflare DNS, add:

```
A @ 74.208.198.84 - proxied
A www 74.208.198.84 - proxied  
A api 74.208.198.84 - proxied
```

The worker will be available at `api.crapgpt.lol/*`

## API Endpoints

### POST /r2/upload

Upload a file to R2.

**Headers:**
- `x-api-key`: Your WORKER_API_KEY
- `content-type`: File MIME type (optional)
- `x-user-id`: User identifier (optional)

**Query Parameters:**
- `key`: Storage key/path (required)
- `contentType`: Override content type (optional)

**Example:**
```typescript
const response = await fetch('https://api.crapgpt.lol/r2/upload?key=chat/abc123-file.png', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-secret-key',
    'content-type': 'image/png'
  },
  body: fileBlob
})
```

### GET /r2/download

Download a file from R2.

**Query Parameters:**
- `key`: Storage key/path (required)

**Example:**
```html
<img src="https://api.crapgpt.lol/r2/download?key=chat/abc123-file.png" />
```

### GET /health

Health check endpoint.

**Example:**
```json
{
  "ok": true,
  "time": 1642694400000
}
```

## Integration with Your App

### From Server (Recommended)

Call the worker from your VPS backend with the API key:

```typescript
// On your server
async function uploadToR2(file: Buffer, key: string, contentType: string) {
  const response = await fetch(`https://api.crapgpt.lol/r2/upload?key=${key}&contentType=${contentType}`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.WORKER_API_KEY!,
      'content-type': contentType
    },
    body: file
  })
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${await response.text()}`)
  }
  
  return response.json()
}
```

### From Client (Via Your Backend)

Create an endpoint on your server that handles the worker communication:

```typescript
// Your server endpoint
app.post('/api/upload', async (req, res) => {
  const user = await authenticateUser(req)
  const key = `user/${user.id}/${crypto.randomUUID()}-${req.file.originalname}`
  
  const result = await uploadToR2(req.file.buffer, key, req.file.mimetype)
  res.json({ 
    success: true, 
    key,
    downloadUrl: `https://api.crapgpt.lol/r2/download?key=${key}` 
  })
})
```

## Security Notes

1. **Never expose WORKER_API_KEY to clients** - always call from your server
2. **Use user-prefixed keys** to prevent access conflicts: `user/${userId}/file.ext`
3. **Validate file types** in your backend before uploading
4. **Set appropriate cache headers** for download responses

## Environment Variables

Configure in `wrangler.toml`:

- `MAX_FILE_SIZE`: Maximum upload size in bytes (default: 104857600 = 100MB)
- `ALLOW_ORIGINS`: Comma-separated list of allowed origins

## Monitoring

- Check deployment status: `wrangler deployments list`
- View logs: `wrangler tail`
- Worker analytics available in Cloudflare dashboard

## Development

```bash
# Local development
wrangler dev

# Type checking
npm run types
```

The worker will be available at `http://localhost:8787` during development.