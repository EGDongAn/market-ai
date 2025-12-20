# AI-Powered Features Setup Guide

This document describes the AI-powered features in the market-ai application and how to configure them.

## Features

### 1. AI Package Suggestions (`/api/packages/suggest`)

Generates intelligent treatment package recommendations using AI.

**Features:**
- Semantic search using vector embeddings to find relevant procedures
- AI-generated package names and descriptions in Korean
- Competitive pricing analysis
- Automatic discount rate suggestions (10-25%)
- Fallback to rule-based suggestions if AI fails

**Request:**
```json
POST /api/packages/suggest
{
  "intent": "안티에이징",  // Optional: search query for procedures
  "budget": 500000,        // Optional: budget constraint
  "procedureCount": 3      // Optional: number of procedures per package (default: 3)
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "name": "안티에이징 풀코스",
      "description": "피부 노화 방지를 위한 종합 케어 패키지",
      "procedures": [...],
      "rationale": "이 패키지를 추천하는 이유와 경쟁력",
      "discountRate": 15,
      "totalPrice": 450000
    }
  ]
}
```

### 2. Competitor Insights (`/api/competitors/[id]/insights`)

Analyzes competitor pricing strategies and provides actionable insights.

**Features:**
- Market positioning analysis (Premium/Mid/Budget)
- Price comparison vs market average
- Strengths and weaknesses identification
- Strategic recommendations
- Fallback to statistical analysis if AI fails

**Request:**
```
GET /api/competitors/123/insights
```

**Response:**
```json
{
  "competitor": {
    "id": 123,
    "name": "경쟁사 이름",
    "type": "병원",
    "region": "강남구"
  },
  "priceAnalysis": {
    "totalProcedures": 45,
    "avgVsMarket": "+12.5%",
    "priceComparison": [...]
  },
  "insights": {
    "positioning": "프리미엄",
    "priceVsMarket": "+12.5%",
    "strengths": ["강점1", "강점2"],
    "weaknesses": ["약점1", "약점2"],
    "suggestions": ["전략1", "전략2"]
  }
}
```

## Setup

### 1. Get Google AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create or select a project
3. Generate an API key

### 2. Configure Environment Variables

Add to your `.env.local` file:

```bash
GOOGLE_AI_API_KEY=your_api_key_here
```

### 3. Enable Vector Search (Optional)

For semantic search to work, you need to:

1. Enable the pgvector extension in your PostgreSQL database:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

2. Generate embeddings for existing procedures:
```bash
npm run generate-embeddings
```

Or create a script at `scripts/generate-embeddings.ts`:
```typescript
import { generateAllEmbeddings } from '@/lib/vector-search';

async function main() {
  await generateAllEmbeddings();
}

main().catch(console.error);
```

## AI Library Components

### `/lib/ai.ts`
Core AI functions using Google's Gemini model:
- `generateText(prompt)` - Generate text responses
- `generateJSON<T>(prompt)` - Generate structured JSON responses
- `generateEmbedding(text)` - Generate vector embeddings for semantic search

### `/lib/prompts.ts`
AI prompts for different features:
- `packageSuggestionPrompt` - Package recommendation prompt
- `competitorInsightPrompt` - Competitor analysis prompt
- `procedureSearchPrompt` - Search keyword extraction prompt

### `/lib/vector-search.ts`
Vector similarity search functions:
- `searchProcedures(query, options)` - Semantic search for procedures
- `generateProcedureEmbedding(procedureId)` - Generate embedding for a procedure
- `generateAllEmbeddings()` - Batch generate all embeddings

## Model Configuration

Current configuration (in `/lib/ai.ts`):
- Model: `gemini-1.5-flash` (fast, cost-effective)
- Temperature: 0.7 (balanced creativity)
- Max tokens: 2048

For better quality (slower, more expensive), consider switching to:
- Model: `gemini-1.5-pro`
- Temperature: 0.5 (more focused)
- Max tokens: 4096

## Error Handling

All AI functions include fallback mechanisms:
- Package suggestions fall back to rule-based generation
- Competitor insights fall back to statistical analysis
- Vector search falls back to text-based search

This ensures the application remains functional even if:
- Google AI API is down
- API key is invalid or missing
- Vector embeddings are not generated

## Cost Optimization

To minimize API costs:
1. Cache frequently used AI responses
2. Use vector search fallback when embeddings exist
3. Batch process embedding generation during off-peak hours
4. Consider rate limiting for high-traffic endpoints

## Testing

Test the endpoints:

```bash
# Test package suggestions
curl -X POST http://localhost:3000/api/packages/suggest \
  -H "Content-Type: application/json" \
  -d '{"intent": "안티에이징", "procedureCount": 3}'

# Test competitor insights
curl http://localhost:3000/api/competitors/1/insights
```

## Troubleshooting

**Issue: "Failed to generate AI response"**
- Check if `GOOGLE_AI_API_KEY` is set correctly
- Verify API key has not exceeded quota
- Check Google AI Studio for service status

**Issue: Vector search not working**
- Ensure pgvector extension is installed
- Generate embeddings using the generate-embeddings script
- Check database connection and permissions

**Issue: Slow responses**
- Consider switching to gemini-1.5-flash if using gemini-1.5-pro
- Implement caching for frequently requested data
- Use pagination for large result sets
