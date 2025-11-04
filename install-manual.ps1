# Manual Installation Script
# Run this in PowerShell if npm has issues

Write-Host "Installing SpecBot dependencies manually..." -ForegroundColor Green

# Core dependencies
$packages = @(
    "@prisma/client@5.20.0",
    "next@14.2.15",
    "react@18.3.1",
    "react-dom@18.3.1",
    "openai@4.67.3",
    "pdf-parse@1.1.1",
    "pdfjs-dist@4.8.69",
    "zustand@4.5.5",
    "date-fns@4.1.0",
    "lucide-react@0.454.0"
)

$devPackages = @(
    "@types/node@20",
    "@types/react@18",
    "@types/react-dom@18",
    "typescript@5",
    "tailwindcss@3.4.1",
    "postcss@8",
    "autoprefixer@10.0.1",
    "prisma@5.20.0",
    "eslint@8",
    "eslint-config-next@14.2.15"
)

Write-Host "Installing core dependencies..." -ForegroundColor Yellow
foreach ($package in $packages) {
    Write-Host "Installing $package..." -ForegroundColor Cyan
    npm install $package --legacy-peer-deps
}

Write-Host "`nInstalling dev dependencies..." -ForegroundColor Yellow
foreach ($package in $devPackages) {
    Write-Host "Installing $package..." -ForegroundColor Cyan
    npm install -D $package --legacy-peer-deps
}

Write-Host "`nGenerating Prisma client..." -ForegroundColor Yellow
npx prisma generate

Write-Host "`nDone! You can now run: npm run dev" -ForegroundColor Green
