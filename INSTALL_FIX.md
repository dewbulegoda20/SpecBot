# 🔧 Manual Installation Fix

## Problem
The npm installation is failing due to node_modules lock/permission issues.

## Solution: Install Packages Manually

### Option 1: Close VS Code and Install (RECOMMENDED)

1. **Close VS Code completely** (this releases file locks)
2. Open PowerShell in your project folder
3. Run:
   ```powershell
   npm install
   ```

### Option 2: Restart Computer
If Option 1 doesn't work:
1. Restart your computer (clears all file locks)
2. Open PowerShell in F:\SpecBot
3. Run:
   ```powershell
   npm install
   ```

### Option 3: Manual Package Download (Advanced)
If npm still fails, you can manually download and extract packages:

1. Download Azure package:
   ```powershell
   npm install --no-save --legacy-peer-deps @azure/ai-form-recognizer
   ```

2. Download Pinecone package:
   ```powershell
   npm install --no-save --legacy-peer-deps @pinecone-database/pinecone
   ```

### Option 4: Use Yarn Instead
```powershell
# Install Yarn
npm install -g yarn

# Install packages
yarn add @azure/ai-form-recognizer @pinecone-database/pinecone
```

## Verify Installation

After successful installation, verify:

```powershell
# Check if packages are installed
node -e "console.log(require('@azure/ai-form-recognizer'))"
node -e "console.log(require('@pinecone-database/pinecone'))"
```

## What's Already Done

✅ Packages are added to `package.json`:
```json
{
  "dependencies": {
    "@azure/ai-form-recognizer": "^5.0.0",
    "@pinecone-database/pinecone": "^3.0.0",
    ...
  }
}
```

Once npm install succeeds, the packages will be automatically installed!

## Next Steps After Installation

1. Test Azure connection:
   ```powershell
   node test-azure.js
   ```

2. Test Pinecone connection:
   ```powershell
   node test-pinecone.js
   ```

3. Apply database schema:
   ```powershell
   npx prisma db push
   npx prisma generate
   ```

4. Start development server:
   ```powershell
   npm run dev
   ```
