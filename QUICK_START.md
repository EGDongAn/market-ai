# Quick Start Guide - AI Features

## 🚀 Get Started in 3 Steps

### 1. Set up Google AI API Key

```bash
# Get your API key from https://makersuite.google.com/app/apikey
echo "GOOGLE_AI_API_KEY=your_key_here" >> .env.local
```

### 2. Enable Vector Search (Optional but Recommended)

```sql
-- Connect to your PostgreSQL database
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Test the APIs

```bash
# Start the development server
npm run dev

# Test package suggestions
curl -X POST http://localhost:3000/api/packages/suggest \
  -H "Content-Type: application/json" \
  -d '{"intent": "안티에이징"}'

# Test competitor insights
curl http://localhost:3000/api/competitors/1/insights
```

## 📚 API Reference

### Package Suggestions

**Endpoint:** `POST /api/packages/suggest`

**Request:**
```json
{
  "intent": "피부관리",      // Optional: what the customer wants
  "procedureCount": 3       // Optional: procedures per package (default: 3)
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "name": "AI-generated package name",
      "description": "Package description",
      "procedures": [...],
      "rationale": "Why this package makes sense",
      "discountRate": 15,
      "totalPrice": 450000
    }
  ]
}
```

### Competitor Insights

**Endpoint:** `GET /api/competitors/{id}/insights`

**Response:**
```json
{
  "competitor": { ... },
  "priceAnalysis": {
    "totalProcedures": 45,
    "avgVsMarket": "+12.5%",
    "priceComparison": [...]
  },
  "insights": {
    "positioning": "프리미엄",
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1"],
    "suggestions": ["strategy 1", "strategy 2"]
  }
}
```

## 🔧 Key Files

| File | Purpose |
|------|---------|
| `/lib/ai.ts` | Core AI functions (generateText, generateJSON, generateEmbedding) |
| `/lib/prompts.ts` | AI prompts and templates |
| `/lib/vector-search.ts` | Semantic search functionality |
| `/app/api/packages/suggest/route.ts` | Package suggestion endpoint |
| `/app/api/competitors/[id]/insights/route.ts` | Competitor insights endpoint |

## ✅ Verification Checklist

- [ ] `GOOGLE_AI_API_KEY` is set in `.env.local`
- [ ] Development server starts without errors
- [ ] Package suggestion endpoint returns data
- [ ] Competitor insights endpoint returns data
- [ ] No TypeScript errors: `npx tsc --noEmit --skipLibCheck`

## 🐛 Troubleshooting

**Problem:** "Failed to generate AI response"
- ✅ Check if `GOOGLE_AI_API_KEY` is set correctly
- ✅ Verify the API key is valid and has quota

**Problem:** Vector search not working
- ✅ Enable pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`
- ✅ Generate embeddings (see AI_FEATURES.md)

**Problem:** Slow responses
- ✅ Normal on first request (AI model initialization)
- ✅ Consider implementing caching for production

## 📖 Full Documentation

- **Setup Guide:** See `AI_FEATURES.md`
- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`
- **Main README:** See project root README

## 🎯 Next Steps

1. Generate embeddings for better search: See `AI_FEATURES.md` section 3
2. Customize prompts in `/lib/prompts.ts` for your use case
3. Add caching for frequently requested data
4. Set up monitoring for AI API usage
5. Implement rate limiting for production

## 💡 Tips

- The AI has fallback mechanisms - it will never completely fail
- Start without embeddings - text search works fine initially
- Customize prompts to match your business needs
- Monitor API usage to optimize costs
- Test with real data for best results
