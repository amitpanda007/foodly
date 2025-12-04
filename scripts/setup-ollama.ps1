# Script to setup Ollama with the required model for Windows

Write-Host "🤖 Setting up Ollama for Foodly..." -ForegroundColor Green
Write-Host ""

# Check if Ollama is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Ollama is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Ollama doesn't seem to be running at localhost:11434" -ForegroundColor Yellow
    Write-Host "Please start Ollama first:" -ForegroundColor Yellow
    Write-Host "  - Open the Ollama app from Start menu"
    Write-Host "  - Or run: ollama serve"
    Write-Host ""
    Write-Host "Or use Docker:" -ForegroundColor Cyan
    Write-Host "  docker-compose -f docker-compose.dev.yml up -d ollama"
    exit 1
}

Write-Host ""

# Pull the model
$MODEL = "llama3.2:3b"
Write-Host "📥 Pulling $MODEL model..." -ForegroundColor Cyan
Write-Host "   (This may take a few minutes on first run)" -ForegroundColor Gray
Write-Host ""

ollama pull $MODEL

Write-Host ""
Write-Host "✅ Model $MODEL is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "You can also try other models:" -ForegroundColor Cyan
Write-Host "  - ollama pull mistral:7b (better quality, more resources)"
Write-Host "  - ollama pull phi3:3.8b (Microsoft's small model)"
Write-Host "  - ollama pull llama3.2:1b (smallest, fastest)"
Write-Host ""
Write-Host "Update your .env file to use a different model:" -ForegroundColor Yellow
Write-Host "  OLLAMA_MODEL=mistral:7b"

