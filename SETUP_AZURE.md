# 🔧 Azure Document Intelligence Setup Guide

## Step 1: Create Azure Account

1. **Go to Azure Portal**
   - Visit: https://portal.azure.com
   - Click "Start free" or "Sign in"

2. **Sign Up (if new user)**
   ```
   Free Account Includes:
   ├── $200 credit for 30 days
   ├── 12 months of free services
   ├── Always-free tier services
   └── No automatic charges
   
   Required:
   ├── Email address
   ├── Phone number (verification)
   └── Credit card (not charged unless you upgrade)
   ```

3. **Verify Account**
   - Enter phone verification code
   - Enter credit card (for identity verification only)
   - Complete setup

---

## Step 2: Create Document Intelligence Resource

1. **In Azure Portal Dashboard**
   - Click "+ Create a resource" (top left)

2. **Search for Service**
   - Type: "Document Intelligence"
   - Click on "Azure AI Document Intelligence"
   - Click "Create"

3. **Fill Configuration Form**

   | Field | Value | Notes |
   |-------|-------|-------|
   | **Subscription** | Free Trial | Your active subscription |
   | **Resource Group** | `specbot-resources` | Click "Create new" |
   | **Region** | `East US` | Choose closest region |
   | **Name** | `specbot-doc-intel` | Must be globally unique |
   | **Pricing Tier** | `F0 (Free)` | Start with free tier |

   **Region Options:**
   - USA: `East US`, `West US 2`, `Central US`
   - Europe: `West Europe`, `North Europe`
   - Asia: `Southeast Asia`, `East Asia`
   
   **Pricing Tiers:**
   ```
   F0 (Free):
   ├── 500 pages/month FREE
   ├── 20 transactions per minute
   ├── Perfect for development/testing
   └── Can upgrade anytime
   
   S0 (Standard):
   ├── $1.50 per 1,000 pages
   ├── 15 transactions per second
   ├── Production-ready
   └── First 1M pages/month pricing
   ```

4. **Review + Create**
   - Click "Review + create"
   - Wait for validation (5-10 seconds)
   - Click "Create"
   - Deployment takes 1-2 minutes

---

## Step 3: Get Keys and Endpoint

1. **After Deployment**
   - Click "Go to resource"
   - Or find it: Home → All resources → `specbot-doc-intel`

2. **Navigate to Keys**
   - Left sidebar → Click "Keys and Endpoint"

3. **Copy Credentials**

   **Endpoint (looks like this):**
   ```
   https://specbot-doc-intel.cognitiveservices.azure.com/
   ```
   
   **Key 1 (32-character string):**
   ```
   a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```

4. **Store Safely**
   - Copy to `.env.local` (next step)
   - Keep private (never commit to GitHub)

---

## Step 4: Add to Environment Variables

Open `f:\SpecBot\.env.local` and add:

```env
# Azure Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://YOUR-RESOURCE-NAME.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-32-character-key-here
```

**Example:**
```env
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://specbot-doc-intel.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## Step 5: Test Connection

```bash
# Install dependencies first
npm install @azure/ai-form-recognizer

# Run test
node test-azure.js
```

Expected output:
```
✅ Environment variables found
✅ Client created successfully
🎉 Azure Document Intelligence is set up correctly!
```

---

## Troubleshooting

### Error: "Invalid API key"
```
Solution:
1. Go back to Azure Portal
2. Keys and Endpoint → Regenerate Key 1
3. Copy the new key
4. Update .env.local
```

### Error: "Endpoint not found"
```
Solution:
1. Check endpoint URL has https://
2. Check it ends with .cognitiveservices.azure.com/
3. No extra spaces or characters
```

### Error: "Quota exceeded"
```
Solution:
1. Free tier: 500 pages/month
2. Check usage: Azure Portal → Resource → Metrics
3. Upgrade to S0 if needed
```

---

## Cost Management

### Monitor Usage
1. Azure Portal → Your Resource
2. Click "Metrics" (left sidebar)
3. Select "Total Calls" metric
4. Monitor daily/monthly usage

### Set Budget Alerts
1. Azure Portal → Subscriptions
2. Select your subscription
3. Click "Budgets"
4. Create alert at $5, $10, etc.

---

## Next Steps

✅ Azure setup complete
⬜ Pinecone setup
⬜ Install dependencies
⬜ Implement code
⬜ Test with sample PDF
