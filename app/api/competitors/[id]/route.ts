import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/competitors/[id] - 특정 경쟁사 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 ID입니다.' },
        { status: 400 }
      )
    }

    const competitor = await prisma.market_competitors.findUnique({
      where: { id },
    })

    if (!competitor) {
      return NextResponse.json(
        { error: '경쟁사를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(competitor)
  } catch (error) {
    console.error('경쟁사 조회 오류:', error)
    return NextResponse.json(
      { error: '경쟁사 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PATCH /api/competitors/[id] - 경쟁사 정보 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 ID입니다.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, website, region, type, is_active, crawl_priority } = body

    // 필수 필드 검증
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: '병원명은 필수 입력 항목입니다.' },
        { status: 400 }
      )
    }

    // 경쟁사 존재 확인
    const existing = await prisma.market_competitors.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '경쟁사를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 이름 중복 체크 (자신 제외)
    if (name.trim() !== existing.name) {
      const duplicate = await prisma.market_competitors.findUnique({
        where: { name: name.trim() },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: '이미 등록된 경쟁사 이름입니다.' },
          { status: 400 }
        )
      }
    }

    // 경쟁사 정보 업데이트
    const competitor = await prisma.market_competitors.update({
      where: { id },
      data: {
        name: name.trim(),
        website: website?.trim() || null,
        region: region?.trim() || null,
        type: type?.trim() || null,
        is_active: is_active ?? true,
        crawl_priority: crawl_priority ? parseInt(crawl_priority) : 5,
      },
    })

    return NextResponse.json(competitor)
  } catch (error) {
    console.error('경쟁사 수정 오류:', error)
    return NextResponse.json(
      { error: '경쟁사 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/competitors/[id] - 경쟁사 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 ID입니다.' },
        { status: 400 }
      )
    }

    // 경쟁사 존재 확인
    const existing = await prisma.market_competitors.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '경쟁사를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 경쟁사 삭제 (Cascade로 관련 데이터도 삭제됨)
    await prisma.market_competitors.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('경쟁사 삭제 오류:', error)
    return NextResponse.json(
      { error: '경쟁사 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
