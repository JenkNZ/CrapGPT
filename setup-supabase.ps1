# CrapGPT Supabase Setup Script for Windows
# This script helps you configure your environment for Supabase

Write-Host "🚀 CrapGPT Supabase Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found. Please copy .env.template to .env first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Setup Steps:" -ForegroundColor Yellow
Write-Host "1. Create Supabase project at https://supabase.com" -ForegroundColor White
Write-Host "2. Go to Project Settings > API" -ForegroundColor White
Write-Host "3. Copy your Project URL and API Keys" -ForegroundColor White
Write-Host "4. Run the schema in SQL Editor" -ForegroundColor White
Write-Host ""

# Prompt for Supabase details
Write-Host "🔧 Let's configure your environment:" -ForegroundColor Green
Write-Host ""

$supabaseUrl = Read-Host "Enter your Supabase Project URL (https://yourproject.supabase.co)"
$supabaseAnonKey = Read-Host "Enter your Supabase Anon Key"
$supabaseServiceKey = Read-Host "Enter your Supabase Service Role Key"

if ([string]::IsNullOrWhiteSpace($supabaseUrl) -or 
    [string]::IsNullOrWhiteSpace($supabaseAnonKey) -or 
    [string]::IsNullOrWhiteSpace($supabaseServiceKey)) {
    Write-Host "❌ All Supabase fields are required." -ForegroundColor Red
    exit 1
}

# Generate encryption key
$encryptionKey = -join ((1..32) | ForEach {Get-Random -input ([char[]](65..90 + 97..122 + 48..57))})

Write-Host ""
Write-Host "⚙️ Updating .env file..." -ForegroundColor Yellow

# Read current .env file
$envContent = Get-Content ".env" -Raw

# Update Supabase configuration
$envContent = $envContent -replace "SUPABASE_URL=.*", "SUPABASE_URL=$supabaseUrl"
$envContent = $envContent -replace "SUPABASE_ANON_KEY=.*", "SUPABASE_ANON_KEY=$supabaseAnonKey" 
$envContent = $envContent -replace "SUPABASE_SERVICE_ROLE_KEY=.*", "SUPABASE_SERVICE_ROLE_KEY=$supabaseServiceKey"
$envContent = $envContent -replace "CONNECTION_ENCRYPTION_KEY=.*", "CONNECTION_ENCRYPTION_KEY=$encryptionKey"

# Update DATABASE_URL to point to Supabase
$dbUrl = $supabaseUrl -replace "https://", "postgresql://postgres:[password]@db." 
$dbUrl = $dbUrl -replace ".supabase.co", ".supabase.co:5432/postgres"
$envContent = $envContent -replace "DATABASE_URL=.*", "DATABASE_URL=$dbUrl"

# Save updated .env file
Set-Content ".env" -Value $envContent

Write-Host "✅ Environment file updated!" -ForegroundColor Green
Write-Host ""

Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Replace [password] in DATABASE_URL with your actual database password" -ForegroundColor White
Write-Host "2. Go to Supabase Dashboard > SQL Editor" -ForegroundColor White
Write-Host "3. Run the contents of 'supabase_schema.sql' file" -ForegroundColor White
Write-Host "4. Enable Realtime for: jobs, chat_messages, agent_tasks, tool_executions" -ForegroundColor White
Write-Host "5. Add your provider API keys (OpenRouter, FAL, etc.)" -ForegroundColor White
Write-Host ""

Write-Host "🔗 Quick Links:" -ForegroundColor Cyan
Write-Host "- Supabase Dashboard: $supabaseUrl" -ForegroundColor White
Write-Host "- SQL Editor: $supabaseUrl/sql/new" -ForegroundColor White
Write-Host "- Database Settings: $supabaseUrl/project/default/settings/database" -ForegroundColor White
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "- Full setup guide: SUPABASE_SETUP.md" -ForegroundColor White
Write-Host "- Schema reference: supabase_schema.sql" -ForegroundColor White
Write-Host ""

Write-Host "🎉 Setup script completed! Follow the next steps above to complete your Supabase integration." -ForegroundColor Green