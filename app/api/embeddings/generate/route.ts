import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateEmbedding } from '@/lib/ai'

export async function POST() {
  try {
    // Get all procedures
    const procedures = await prisma.market_procedures.findMany({
      include: {
        market_procedure_subcategories: {
          include: { market_procedure_categories: true }
        }
      }
    })

    let created = 0
    let updated = 0
    let errors = 0

    for (const procedure of procedures) {
      try {
        // Build content for embedding
        const aliases = (procedure.aliases as string[]) || []
        const content = [
          procedure.name,
          procedure.brand,
          ...aliases,
          procedure.market_procedure_subcategories?.name,
          procedure.market_procedure_subcategories?.market_procedure_categories?.name
        ].filter(Boolean).join(' ')

        // Generate embedding
        const embedding = await generateEmbedding(content)

        // Check if exists
        const existing = await prisma.market_procedure_embeddings.findUnique({
          where: { procedure_id: procedure.id }
        })

        if (existing) {
          // Update
          await prisma.market_procedure_embeddings.update({
            where: { procedure_id: procedure.id },
            data: {
              embedding: embedding,
              content: content
            }
          })
          updated++
        } else {
          // Insert
          await prisma.market_procedure_embeddings.create({
            data: {
              procedure_id: procedure.id,
              embedding: embedding,
              content: content
            }
          })
          created++
        }
      } catch (err) {
        console.error(`Failed to embed procedure ${procedure.id}:`, err)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      total: procedures.length,
      created,
      updated,
      errors
    })
  } catch (error) {
    console.error('Failed to generate embeddings:', error)
    return NextResponse.json(
      { error: 'Failed to generate embeddings' },
      { status: 500 }
    )
  }
}
