# Set paths for Node/npm
$env:PATH = "C:\Program Files\nodejs;C:\Users\User\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin;" + $env:PATH
$npm = "C:\Program Files\nodejs\npm.cmd"

Write-Host "🚧 Building Frontend..." -ForegroundColor Yellow
& $npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "🚀 Deploying Frontend to Vercel..." -ForegroundColor Cyan
    npx vercel --prod
}
else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Vercel Deployment Triggered! Check your packsecure Dashboard." -ForegroundColor Green
