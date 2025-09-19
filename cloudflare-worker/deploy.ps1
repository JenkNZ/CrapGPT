# PowerShell script to deploy Cloudflare Worker with secrets
param(
    [string]$WorkerApiKey = "",
    [string]$SupabaseJwtKey = ""
)

Write-Host "🚀 Deploying CrapGPT R2 Gateway Worker..." -ForegroundColor Green

# Check if wrangler is installed
if (!(Get-Command "wrangler" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Wrangler CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g wrangler
}

# Check if logged in
$loginCheck = wrangler whoami 2>&1
if ($loginCheck -match "not authenticated" -or $loginCheck -match "error") {
    Write-Host "🔐 Please login to Cloudflare..." -ForegroundColor Yellow
    wrangler login
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

# Set secrets if provided
if ($WorkerApiKey) {
    Write-Host "🔑 Setting WORKER_API_KEY secret..." -ForegroundColor Blue
    echo $WorkerApiKey | wrangler secret put WORKER_API_KEY
} else {
    Write-Host "⚠️  No WORKER_API_KEY provided. You'll need to set it manually:" -ForegroundColor Yellow
    Write-Host "   wrangler secret put WORKER_API_KEY" -ForegroundColor Gray
}

if ($SupabaseJwtKey) {
    Write-Host "🔑 Setting SUPABASE_JWT_PUBLIC_KEY secret..." -ForegroundColor Blue
    echo $SupabaseJwtKey | wrangler secret put SUPABASE_JWT_PUBLIC_KEY
}

# Deploy the worker
Write-Host "🌐 Deploying worker..." -ForegroundColor Blue
wrangler deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Worker deployed successfully!" -ForegroundColor Green
    Write-Host "   Worker URL: https://api.crapgpt.lol" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Blue
    Write-Host "   1. Configure DNS in Cloudflare dashboard:" -ForegroundColor Gray
    Write-Host "      A @ 74.208.198.84 - proxied" -ForegroundColor Gray
    Write-Host "      A www 74.208.198.84 - proxied" -ForegroundColor Gray
    Write-Host "      A api 74.208.198.84 - proxied" -ForegroundColor Gray
    Write-Host "   2. Test health endpoint: https://api.crapgpt.lol/health" -ForegroundColor Gray
    Write-Host "   3. Update your app to use the new R2 endpoints" -ForegroundColor Gray
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

# Usage examples
Write-Host ""
Write-Host "💡 Usage Examples:" -ForegroundColor Magenta
Write-Host "   Upload: POST https://api.crapgpt.lol/r2/upload?key=chat/file.png" -ForegroundColor Gray
Write-Host "   Download: GET https://api.crapgpt.lol/r2/download?key=chat/file.png" -ForegroundColor Gray
Write-Host "   Health: GET https://api.crapgpt.lol/health" -ForegroundColor Gray