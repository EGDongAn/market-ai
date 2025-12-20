import { prisma } from '@/lib/prisma'
import { generateEmbedding } from '@/lib/ai'

export interface SearchResult {
  id: number
  name: string
  brand: string | null
  aliases: string[] | null
  similarity: number
  subcategory: {
    id: number
    name: string
    category: {
      id: number
      name: string
    }
  }
}

// Cosine similarity calculation
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  return magnitude === 0 ? 0 : dotProduct / magnitude
}

export async function searchProcedures(
  query: string,
  options: {
    limit?: number
    categoryId?: number
    subcategoryId?: number
    threshold?: number
  } = {}
): Promise<SearchResult[]> {
  const { limit = 10, categoryId, subcategoryId, threshold = 0.3 } = options

  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query)

    // Build where clause
    const whereClause: {
      procedure?: {
        subcategory_id?: number
        subcategory?: { category_id?: number }
      }
    } = {}

    if (subcategoryId) {
      whereClause.procedure = { subcategory_id: subcategoryId }
    } else if (categoryId) {
      whereClause.procedure = { subcategory: { category_id: categoryId } }
    }

    // Get all embeddings from database
    const embeddings = await prisma.market_procedure_embeddings.findMany({
      where: whereClause,
      include: {
        procedure: {
          include: {
            subcategory: {
              include: { category: true }
            }
          }
        }
      }
    })

    // Calculate similarities
    const results = embeddings
      .map(e => {
        const storedEmbedding = e.embedding as number[]
        const similarity = cosineSimilarity(queryEmbedding, storedEmbedding)
        return {
          id: e.procedure.id,
          name: e.procedure.name,
          brand: e.procedure.brand,
          aliases: e.procedure.aliases as string[] | null,
          similarity,
          subcategory: {
            id: e.procedure.subcategory.id,
            name: e.procedure.subcategory.name,
            category: {
              id: e.procedure.subcategory.category.id,
              name: e.procedure.subcategory.category.name
            }
          }
        }
      })
      .filter(r => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    return results
  } catch (error) {
    console.error('Vector search failed, falling back to text search:', error)
    // Fallback to text-based search
    return fallbackTextSearch(query, { limit, categoryId, subcategoryId })
  }
}

async function fallbackTextSearch(
  query: string,
  options: { limit?: number; categoryId?: number; subcategoryId?: number }
): Promise<SearchResult[]> {
  const { limit = 10, categoryId, subcategoryId } = options

  const whereClause: {
    OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; brand?: { contains: string; mode: 'insensitive' } }>
    subcategory_id?: number
    subcategory?: { category_id?: number }
  } = {
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { brand: { contains: query, mode: 'insensitive' } }
    ]
  }

  if (subcategoryId) {
    whereClause.subcategory_id = subcategoryId
  } else if (categoryId) {
    whereClause.subcategory = { category_id: categoryId }
  }

  const procedures = await prisma.market_procedures.findMany({
    where: whereClause,
    include: {
      subcategory: {
        include: { category: true }
      }
    },
    take: limit
  })

  return procedures.map(p => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    aliases: p.aliases as string[] | null,
    similarity: 0.5, // Default similarity for text search
    subcategory: {
      id: p.subcategory.id,
      name: p.subcategory.name,
      category: {
        id: p.subcategory.category.id,
        name: p.subcategory.category.name
      }
    }
  }))
}

export async function findSimilarProcedures(
  procedureId: number,
  limit: number = 5
): Promise<SearchResult[]> {
  const procedure = await prisma.market_procedures.findUnique({
    where: { id: procedureId },
    include: {
      subcategory: {
        include: { category: true }
      }
    }
  })

  if (!procedure) return []

  const searchText = [
    procedure.name,
    procedure.brand,
    ...(procedure.aliases as string[] || [])
  ].filter(Boolean).join(' ')

  return searchProcedures(searchText, { limit: limit + 1 })
    .then(results => results.filter(r => r.id !== procedureId).slice(0, limit))
}
