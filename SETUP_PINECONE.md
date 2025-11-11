# 🌲 Pinecone Setup Guide

## Step 1: Create Pinecone Account

1. **Go to Pinecone Website**
   - Visit: https://app.pinecone.io/
   - Click "Sign Up" (top right)

2. **Sign Up Options**
   ```
   Choose one:
   ├── Sign up with Google (fastest)
   ├── Sign up with GitHub
   └── Sign up with Email
   ```

3. **Complete Registration**
   - Enter your information
   - Verify email (if using email signup)
   - No credit card required for free tier!

---

## Step 2: Create Your First Index

1. **After Login**
   - You'll see the Pinecone dashboard
   - Click "Create Index" or "Create your first index"

2. **Index Configuration**

   | Field | Value | Explanation |
   |-------|-------|-------------|
   | **Index Name** | `specbot-embeddings` | Lowercase, no spaces |
   | **Dimensions** | `1536` | OpenAI embedding size |
   | **Metric** | `cosine` | Best for text similarity |
   | **Cloud Provider** | `AWS` | Amazon Web Services |
   | **Region** | `us-east-1` | Closest to your users |
   | **Plan** | `Starter (Free)` | Free tier selected |

   **Dimension Sizes by Model:**
   ```
   OpenAI text-embedding-3-small: 1536 ← YOU USE THIS
   OpenAI text-embedding-3-large: 3072
   OpenAI ada-002: 1536
   ```

   **Metric Explanation:**
   ```
   cosine: Best for text (normalized vectors)
   euclidean: Good for images
   dotproduct: Advanced use cases
   ```

   **Region Selection:**
   ```
   us-east-1: East US (best for US users)
   eu-west-1: Europe (best for EU users)
   asia-southeast-1: Singapore (best for Asia)
   ```

3. **Free Tier Limits**
   ```
   Starter Plan (FREE):
   ├── 100,000 vectors (~200 PDFs with 50 pages each)
   ├── 1 index
   ├── 5 namespaces (perfect for multi-document)
   ├── Community support
   └── No credit card required!
   
   When you grow:
   Standard Plan ($70/month):
   ├── 1,000,000 vectors (~2,000 PDFs)
   ├── Unlimited indexes
   ├── Unlimited namespaces
   └── Email support
   ```

4. **Click "Create Index"**
   - Wait 30-60 seconds for provisioning
   - Index status will show "Ready"

---

## Step 3: Get API Key

1. **In Pinecone Dashboard**
   - Left sidebar → Click "API Keys"

2. **Copy Your API Key**
   ```
   Format: pcsk_xxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Length: ~60 characters
   ```

3. **Important Notes**
   - ⚠️ Key is shown only once during creation
   - 💾 Save it immediately
   - 🔒 Keep it private (never commit to GitHub)
   - 🔄 Can create new keys if lost

---

## Step 4: Get Environment Details

You need 3 things:

1. **API Key** (from Step 3)
   ```
   pcsk_xxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

2. **Environment** (from index details)
   ```
   Example: us-east-1-aws
   Find it: Dashboard → Your Index → Details
   ```

3. **Index Name** (what you created)
   ```
   specbot-embeddings
   ```

---

## Step 5: Add to Environment Variables

Open `f:\SpecBot\.env.local` and add:

```env
# Pinecone Configuration
PINECONE_API_KEY=your-api-key-here
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=specbot-embeddings
```

**Example:**
```env
PINECONE_API_KEY=pcsk_xxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=specbot-embeddings
```

---

## Step 6: Test Connection

```bash
# Install Pinecone client
npm install @pinecone-database/pinecone

# Run test
node test-pinecone.js
```

Expected output:
```
✅ Pinecone client created
✅ Connected to index: specbot-embeddings
✅ Index stats: { dimension: 1536, totalVectorCount: 0 }
🎉 Pinecone is set up correctly!
```

---

## Understanding Namespaces

**What are namespaces?**
```
Think of namespaces like folders in a filing cabinet:

Index (specbot-embeddings)
├── Namespace: doc-abc123 (Document 1)
│   ├── 250 vectors (chunks from PDF 1)
│   └── All isolated from other docs
├── Namespace: doc-def456 (Document 2)
│   ├── 180 vectors (chunks from PDF 2)
│   └── Search only within this doc
└── Namespace: doc-ghi789 (Document 3)
    ├── 320 vectors (chunks from PDF 3)
    └── Or search across all docs!

Benefits:
✅ Multi-tenancy (one user per namespace)
✅ Document isolation (search per PDF)
✅ Easy deletion (delete namespace = delete all vectors)
```

---

## Pinecone Dashboard Overview

### Key Sections:

1. **Indexes Tab**
   - View all your indexes
   - See vector counts
   - Monitor performance

2. **API Keys Tab**
   - Create/delete keys
   - View key usage
   - Rotate keys

3. **Billing Tab**
   - Current plan (Starter/Standard)
   - Usage metrics
   - Upgrade options

4. **Logs Tab**
   - API call history
   - Error tracking
   - Performance monitoring

---

## Monitoring Usage

### Check Vector Count
```typescript
const stats = await index.describeIndexStats();
console.log('Total vectors:', stats.totalRecordCount);
console.log('Namespaces:', stats.namespaces);
```

### Free Tier Limits
```
Current: 0 / 100,000 vectors
Remaining: 100,000 vectors

Estimate:
├── 1 PDF (50 pages) = ~500 vectors
├── 100 PDFs = ~50,000 vectors
└── 200 PDFs = ~100,000 vectors ← FREE LIMIT
```

---

## Cost Management

### When to Upgrade?

```
Stay on Free if:
├── < 200 PDFs
├── Testing/development
└── Personal projects

Upgrade to Standard ($70/mo) when:
├── > 200 PDFs
├── Production app
├── Need faster queries
└── Multiple teams/users
```

### Optimize Costs
```
1. Delete old/unused documents
2. Use fewer chunks per page (larger chunks)
3. Compress embeddings (advanced)
4. Clean up test data regularly
```

---

## Troubleshooting

### Error: "Index not found"
```
Solution:
1. Check index name spelling
2. Verify index is "Ready" in dashboard
3. Wait 60 seconds after creation
```

### Error: "Invalid API key"
```
Solution:
1. Regenerate key in dashboard
2. Copy exactly (no spaces)
3. Check environment variable name
```

### Error: "Dimension mismatch"
```
Solution:
1. Index dimensions: 1536
2. Embedding dimensions must match
3. OpenAI text-embedding-3-small = 1536 ✅
```

### Error: "Quota exceeded"
```
Solution:
1. Free tier: 100K vectors
2. Delete old documents
3. Or upgrade to Standard plan
```

---

## Security Best Practices

### Protect Your API Key
```
✅ DO:
├── Store in .env.local
├── Add .env.local to .gitignore
├── Use environment variables
└── Rotate keys periodically

❌ DON'T:
├── Commit to GitHub
├── Share in public
├── Hardcode in source
└── Use in client-side code
```

### Access Control
```
1. Create separate keys for dev/prod
2. Use read-only keys where possible
3. Monitor API usage regularly
4. Revoke compromised keys immediately
```

---

## Next Steps

✅ Pinecone setup complete
✅ API key secured
⬜ Install dependencies
⬜ Implement integration
⬜ Test with sample data
⬜ Deploy to production

---

## Quick Reference

### Connection Code
```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const index = pc.index(process.env.PINECONE_INDEX_NAME!);
```

### Common Operations
```typescript
// Upsert vectors
await index.namespace(documentId).upsert([
  { id: 'chunk-1', values: [...], metadata: {...} }
]);

// Query
const results = await index.namespace(documentId).query({
  vector: [...],
  topK: 5
});

// Delete namespace
await index.namespace(documentId).deleteAll();
```

---

## Support Resources

- 📚 Docs: https://docs.pinecone.io/
- 💬 Community: https://community.pinecone.io/
- 📧 Support: support@pinecone.io
- 🎓 Examples: https://github.com/pinecone-io/examples
