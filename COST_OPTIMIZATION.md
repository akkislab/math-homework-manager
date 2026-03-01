# Cost Optimization Plan

## Monthly Cost Estimate (100 students, 4 worksheets/month)

| Service | Usage | Cost |
|---------|-------|------|
| Firebase Auth | Unlimited free | $0 |
| Firestore reads | ~50,000/month | $0 (Spark free: 50k/day) |
| Firestore writes | ~5,000/month | $0 (Spark free: 20k/day) |
| Firebase Hosting | < 10 GB | $0 (free: 10 GB) |
| Firebase Storage | ~500 MB PDFs | $0 (Spark free: 5 GB) |
| Cloud Functions | ~500 invocations | ~$0 (free: 2M/month) |
| **Claude API** | 4 worksheets × 4k tokens | **~$0.06–0.24/month** |
| **Total** | | **~$0.06–0.24/month** |

## Key Optimization Strategies

### 1. One AI Call Per Worksheet Batch (most impactful)
The entire class shares **one Claude API call** per worksheet.
- ❌ Per-student approach: 30 students × $0.01 = $0.30 per worksheet
- ✅ Batch approach: 1 call × $0.01 = **$0.01 per worksheet**

PDFs are generated from the same problem set in Node.js (free) — just personalized names.

### 2. Model Selection
- Use `claude-haiku-4-5-20251001` for simple worksheet topics (grades 1–4)
- Use `claude-opus-4-6` only for complex multi-step problems (grades 7–8)
- Estimated savings: ~70% for lower grades

Add a model selector in `worksheetGenerator.ts`:
```ts
const model = parseInt(req.grade.replace(/\D/g,'')) <= 5
  ? 'claude-haiku-4-5-20251001'
  : 'claude-opus-4-6';
```

### 3. Worksheet Caching
Store generated worksheets in Firestore. When a teacher requests the same
grade+topic combo, serve the cached worksheet instead of calling the AI again.

```ts
// Check cache first
const cached = await db.collection('worksheetTemplates')
  .where('grade', '==', req.grade)
  .where('topic', '==', req.topic)
  .where('numProblems', '==', req.numProblems)
  .limit(1).get();

if (!cached.empty) return regeneratePDFs(cached.docs[0].data(), req.studentIds);
```
This eliminates 80%+ of AI calls for teachers who reuse topics.

### 4. Firebase Free Tier Maximization
- Use Spark plan for everything except Functions (requires Blaze)
- Blaze has the same free tier as Spark + pay-per-use beyond
- Storage PDFs: compress with pdfkit's `compress: true` option (~50% smaller)
- Clean up old submissions > 1 year with a scheduled function

### 5. Notification Strategy
- In-app only (no Firebase Cloud Messaging, no email) = $0
- Real-time Firestore listeners handle badge/grade notifications
- Saves cost vs. using Twilio, SendGrid, or FCM with Cloud Messaging

### 6. Minimize Function Cold Starts
- Keep functions in the same region as Firestore (`us-central1`)
- Use Gen2 functions with minimum instances = 0 (pay only when used)
- Heavy PDF generation runs only on worksheet creation, not every request

## Cost Scaling

| Student Count | AI Cost/Month | Total/Month |
|---------------|---------------|-------------|
| 30 students | ~$0.02 | ~$0.02 |
| 100 students | ~$0.06 | ~$0.06 |
| 300 students | ~$0.20 | ~$0.20 |
| 1,000 students | ~$0.60 | ~$2–5 (storage grows) |

The AI cost is essentially flat because it's per-worksheet, not per-student.
