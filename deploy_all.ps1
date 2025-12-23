# Deploy Frontend (Firebase)
Write-Host "🚧 Building Frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "🚀 Deploying Frontend to Firebase..." -ForegroundColor Cyan
    npx firebase deploy --only hosting
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Deploy Backend (Cloud Run)
Write-Host "🚧 Deploying Backend to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy factory-voice-backend `
    --source . `
    --region asia-southeast1 `
    --allow-unauthenticated `
    --update-env-vars GEMINI_API_KEY=$env:GEMINI_API_KEY

Write-Host "✅ Deployment Complete! Check your mobile app." -ForegroundColor Green
