Write-Host "🔧 Installing packages manually to bypass npm issue..." -ForegroundColor Yellow
Write-Host ""

# Set environment variable to skip scripts
$env:npm_config_ignore_scripts="true"

Write-Host "Step 1: Installing all packages (ignoring scripts)..." -ForegroundColor Cyan
npm install --ignore-scripts

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Packages installed successfully!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Step 2: Running Prisma generate manually..." -ForegroundColor Cyan
    npx prisma generate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Prisma client generated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Installation complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Set up your .env.local file (see .env.example)"
        Write-Host "2. Run: node test-azure.js (after Azure setup)"
        Write-Host "3. Run: node test-pinecone.js (after Pinecone setup)"
        Write-Host "4. Run: npx prisma db push (to apply database schema)"
        Write-Host "5. Run: npm run dev (to start the app)"
    } else {
        Write-Host "❌ Prisma generate failed" -ForegroundColor Red
        Write-Host "Try running: npx prisma generate" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Package installation failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative solution:" -ForegroundColor Yellow
    Write-Host "1. Update Node.js to latest LTS version from: https://nodejs.org/"
    Write-Host "2. Or try installing Yarn: npm install -g yarn"
    Write-Host "3. Then run: yarn install"
}
