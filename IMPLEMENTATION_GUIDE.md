# 🚀 SpecBot Accuracy Implementation Guide

## Step-by-Step Implementation Plan

### ✅ **STEP 1: Set Up Azure Document Intelligence**

#### 1.1 Create Azure Resource
```bash
# Go to: https://portal.azure.com
# Create new resource → Search "Document Intelligence"
# Click Create
# Select:
#   - Resource group: Create new "specbot-resources"
#   - Region: Choose closest to you
#   - Pricing tier: Free F0 (500 pages/month) or Standard S0

# After creation, copy:
#   - Endpoint: https://YOUR-RESOURCE.cognitiveservices.azure.com/
#   - Key: Your API key
```

#### 1.2 Install Dependencies
```bash
npm install @azure/ai-form-recognizer @azure/identity
```

#### 1.3 Add Environment Variables
```env
# .env.local
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://YOUR-RESOURCE.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key-here
```

---

### ✅ **STEP 2: Set Up Pinecone**

#### 2.1 Create Pinecone Account
```bash
# Go to: https://app.pinecone.io/
# Sign up (free tier: 100K vectors)
# Create new index:
#   - Name: specbot-embeddings
#   - Dimensions: 1536
#   - Metric: cosine
#   - Cloud: AWS
#   - Region: us-east-1
```

#### 2.2 Install Pinecone Client
```bash
npm install @pinecone-database/pinecone
```

#### 2.3 Add Environment Variable
```env
# .env.local
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=specbot-embeddings
```

---

### ✅ **STEP 3: Update Database Schema**

```bash
# Update prisma/schema.prisma
# Then run:
npx prisma db push
```

---

### ✅ **STEP 4: Create Utility Files**

Files to create:
1. `lib/azure-document.ts` - Azure Document Intelligence integration
2. `lib/pinecone-client.ts` - Pinecone client wrapper
3. `lib/structured-pdf.ts` - Structured PDF processing
4. `lib/smart-retrieval.ts` - Enhanced retrieval logic

---

### ✅ **STEP 5: Update API Routes**

1. Update `/api/upload/route.ts` - Use Azure for extraction
2. Update `/api/chat/route.ts` - Use Pinecone for search
3. Add `/api/documents/[id]/highlight/route.ts` - Get bounding boxes

---

### ✅ **STEP 6: Enhance Frontend**

1. Update `CustomPDFViewer.tsx` - Add highlighting
2. Update `ChatArea.tsx` - Show structure info (tables, figures)
3. Add visual indicators for chunk types

---

## 🎯 **Testing Checklist**

### Test with Different PDF Types:

- [ ] **Simple text PDF** (paragraphs only)
- [ ] **Technical spec with tables** (your main use case)
- [ ] **Multi-column layout** (brochures, academic papers)
- [ ] **Scanned PDF** (requires OCR)
- [ ] **PDF with charts/figures**
- [ ] **Mixed content** (text + tables + images)

### Validate Accuracy:

- [ ] Page numbers are correct (100% accuracy)
- [ ] Tables extracted as structured data
- [ ] Citations point to exact locations
- [ ] Bounding boxes highlight correct regions
- [ ] Reading order is preserved
- [ ] Headings maintain hierarchy

---

## 📊 **Expected Results**

### Before vs After:

| Scenario | Before | After |
|----------|--------|-------|
| "What is the voltage?" | Cites page 12 (wrong!) | Cites page 15, row 3 of spec table ✅ |
| "Show me circuit breaker specs" | Returns random text | Returns exact table with all values ✅ |
| Multi-column PDF | Scrambled text | Correct reading order ✅ |
| Table question | Can't find data | Extracts structured table data ✅ |

---

## 💡 **Pro Tips**

### 1. **Batch Processing**
```typescript
// Process multiple PDFs efficiently
const batchSize = 5;
for (let i = 0; i < pdfs.length; i += batchSize) {
  const batch = pdfs.slice(i, i + batchSize);
  await Promise.all(batch.map(pdf => processWithAzure(pdf)));
}
```

### 2. **Caching**
```typescript
// Cache processed PDFs to avoid re-processing
// Store Azure results in database
if (existingProcessing) {
  return cachedStructure;
}
```

### 3. **Progress Tracking**
```typescript
// Show user upload progress
websocket.send({
  status: 'processing',
  progress: 45,
  message: 'Extracting tables...'
});
```

### 4. **Error Handling**
```typescript
// Handle Azure API failures gracefully
try {
  const result = await azureClient.analyzeDocument(...);
} catch (error) {
  if (error.code === 'QuotaExceeded') {
    // Fallback to basic pdf-parse
    return fallbackExtraction(pdf);
  }
  throw error;
}
```

---

## 🔧 **Troubleshooting**

### Issue: Azure is slow
**Solution:** Use async processing + background jobs
```typescript
// Queue PDF processing
await jobQueue.add('process-pdf', { documentId });
// Return immediately, notify user when done
```

### Issue: Pinecone quota exceeded
**Solution:** Implement chunk cleanup
```typescript
// Delete old/unused documents
await pinecone.namespace(oldDocId).deleteAll();
```

### Issue: Tables not detected
**Solution:** Check PDF quality
```typescript
// Use hi_res strategy
strategy: 'hi_res'
// Or increase DPI for scanned PDFs
```

### Issue: Wrong bounding boxes
**Solution:** Coordinate system adjustment
```typescript
// Azure uses top-left origin
// Canvas uses bottom-left origin
const adjustedY = pageHeight - (boundingBox.y + boundingBox.height);
```

---

## 📚 **Learning Resources**

- [Azure Document Intelligence Docs](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/)
- [Pinecone Docs](https://docs.pinecone.io/)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [RAG Best Practices](https://www.pinecone.io/learn/retrieval-augmented-generation/)

---

## 🎬 **Next Steps**

1. ✅ Read this guide
2. ✅ Set up Azure + Pinecone accounts
3. ✅ Review the implementation files I'll create
4. ✅ Test with sample PDF
5. ✅ Deploy to production

**Ready to implement? I can start coding the solution right now!** 🚀
