export const packageSuggestionPrompt = `당신은 병원 마케팅 전문가입니다.
다음 시술들로 매력적인 패키지를 구성하세요.

시술 목록:
{{procedures}}

경쟁사 평균 가격:
{{competitorPrices}}

요구사항:
- 패키지명 (한국어, 매력적으로)
- 간단한 설명 (1-2문장)
- 추천 이유 (가격 경쟁력, 시술 시너지 등)
- 추천 할인율 (10-30%)

JSON 형식으로 응답:
{
  "name": "패키지명",
  "description": "설명",
  "rationale": "추천 이유",
  "discountRate": 15
}`

export const competitorInsightPrompt = `당신은 의료 마케팅 분석 전문가입니다.
경쟁사 가격 데이터를 분석하여 인사이트를 제공하세요.

경쟁사: {{competitorName}}
시장 평균 가격: {{marketAvg}}
경쟁사 가격 데이터:
{{priceData}}

다음 내용을 JSON으로 응답:
{
  "positioning": "시장 포지셔닝 (프리미엄/중간/저가)",
  "priceVsMarket": "+12% 또는 -5% 형식",
  "strengths": ["강점1", "강점2"],
  "weaknesses": ["약점1"],
  "suggestions": ["제안1", "제안2"]
}`

export const procedureSearchPrompt = `사용자 검색어를 분석하여 관련 시술 키워드를 추출하세요.
검색어: {{query}}

관련될 수 있는 시술 키워드들을 JSON 배열로 응답:
["키워드1", "키워드2", "키워드3"]`
