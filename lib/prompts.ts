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

// Phase 1-2 추가 프롬프트

export const priceForecastPrompt = `가격 예측 분석 결과를 바탕으로 인사이트를 제공해주세요.

시술: {{procedureName}}
경쟁사: {{competitorName}}
현재 가격 트렌드: {{trend}}
트렌드 강도: {{trendStrength}}%
가격 전략: {{strategy}}
예측 신뢰도: {{confidence}}%

다음 JSON 형식으로 응답:
{
  "summary": "1-2문장 요약",
  "recommendation": "구체적인 대응 방안",
  "riskLevel": "낮음/중간/높음"
}`

export const anomalyInsightPrompt = `다음 가격 이상치를 분석해주세요:

{{anomalies}}

다음 JSON 형식으로 응답:
{
  "summary": "전체 요약 (1-2문장)",
  "potentialCauses": ["원인1", "원인2"],
  "recommendedActions": ["대응방안1", "대응방안2"]
}`

export const weeklyReportPrompt = `병원 마케팅 담당자를 위한 주간 시장 리포트를 작성해주세요.

## 이번 주 요약 데이터
{{summaryData}}

## 주요 가격 변동
{{priceChanges}}

## 카테고리별 동향
{{categoryTrends}}

위 데이터를 바탕으로:
1. 핵심 인사이트 (2-3문장)
2. 주목해야 할 경쟁사 동향
3. 추천 액션 아이템 (3개)

경영진이 빠르게 읽을 수 있도록 간결하게 작성해주세요.`

export const competitorStrategyPrompt = `경쟁사 가격 전략을 분석해주세요.

경쟁사: {{competitorName}}
지역: {{region}}
타입: {{type}}

분석 데이터:
{{analysisData}}

카테고리별 분석:
{{categoryAnalysis}}

다음 JSON 형식으로 응답:
{
  "strategyType": "침투가격/스키밍/경쟁가격/가치기반 중 하나",
  "marketShareEstimate": "예상 시장 점유율 (예: 10-15%)",
  "threatScore": 1-10 사이 숫자,
  "priceAggressiveness": "낮음/중간/높음 중 하나",
  "focusCategories": ["주력 카테고리1", "주력 카테고리2"],
  "recommendations": ["대응 전략1", "대응 전략2", "대응 전략3"]
}`

export const packageOptimizePrompt = `최적화된 시술 패키지를 생성해주세요.

## 요구사항
- 목표 마진율: {{targetMargin}}%
- 패키지당 시술 수: {{procedureCount}}개
- 시즌: {{season}}

## 사용 가능한 시술 목록
{{procedures}}

## JSON 형식으로 응답
{
  "packages": [
    {
      "name": "패키지명 (한국어, 매력적)",
      "description": "패키지 설명 (1-2문장)",
      "procedureIds": [시술ID1, 시술ID2, 시술ID3],
      "optimalDiscount": 15,
      "demandForecast": "높음/중간/낮음",
      "abTestSuggestion": "A안: X% vs B안: Y%",
      "rationale": "추천 이유"
    }
  ]
}`

export const categoryAnalysisPrompt = `각 카테고리별 기회와 위협을 분석해주세요.

카테고리 분석 데이터:
{{categoryData}}

다음 JSON 형식으로 응답:
{
  "analyses": [
    {
      "categoryName": "카테고리명",
      "opportunities": ["기회1", "기회2"],
      "threats": ["위협1", "위협2"]
    }
  ]
}`

export const naturalQueryPrompt = `사용자 질문에 데이터를 기반으로 답변해주세요.

## 질문
"{{question}}"

## 분석된 의도
{{intent}}

## 관련 데이터
{{data}}

## 답변 지침
1. 데이터에 기반한 구체적인 답변을 제공하세요
2. 가격은 원화로 표시하세요 (예: 50,000원)
3. 데이터가 없는 경우 명확히 언급하세요
4. 한국어로 자연스럽게 답변하세요
5. 핵심 정보를 먼저, 부가 정보는 나중에 제공하세요`
