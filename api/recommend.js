export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(455).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.UPSTAGE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'UPSTAGE_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  const { rank1, rank2, rank3, dreamJob, reflection } = req.body;

  const systemPrompt = 
    "당신은 대한민국 청소년 및 중고등학생을 위한 직업가치관 진로 컨설팅 전문 AI입니다.\n" +
    "학생의 직업가치관 검사 결과(1순위, 2순위, 3순위)와 관심 직업, 성찰 내용을 종합적으로 분석하여 " +
    "학생의 가치관을 가장 잘 실현할 수 있는 맞춤형 추천 직업 3가지를 도출하세요.\n\n" +
    "[추천 정확도 향상 지침]\n" +
    "1. 1~3순위 가치관의 핵심 특성이 상충되지 않고 종합적으로 발휘될 수 있는 직업이어야 합니다.\n" +
    "2. 한국표준직업분류 및 고용노동부 워크넷 기준의 실존 직업명을 사용하세요 (중국어 직업명 및 한어병음 병기).\n" +
    "3. 학생의 관심 직업과 연계하여, 왜 이 직업이 학생의 가치관에 적합한지 구체적인 이유(2~3문장)를 기술하세요.\n" +
    "4. 반드시 오직 JSON 규격으로만 응답해야 하며, 마크다운 코드블록 없이 순수 JSON 문자열만 출력하세요.\n\n" +
    "[JSON 응답 형식 예시]\n" +
    "{\n" +
    '  "analysis": "1순위인 [가치]와 2~3순위 [가치]를 아우르는 직업적 핵심 특성 총평",\n' +
    '  "jobs": [\n' +
    "    {\n" +
    '      "jobKr": "한국어 직업명",\n' +
    '      "jobZh": "중국어 직업명",\n' +
    '      "jobPy": "한어병음",\n' +
    '      "reason": "추천 이유 및 가치관 부합 설명"\n' +
    "    }\n" +
    "  ]\n" +
    "}";

  const userPrompt = 
    `학생 진단 정보:\n` +
    `- 1순위 가치: ${rank1 || "미선택"}\n` +
    `- 2순위 가치: ${rank2 || "미선택"}\n` +
    `- 3순위 가치: ${rank3 || "미선택"}\n` +
    `- 학생의 관심 직업: ${dreamJob || "미정"}\n` +
    `- 학생의 진로 성찰: ${reflection || "없음"}`;

  try {
    const response = await fetch("https://api.upstage.ai/v1/solar/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "solar-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1200
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const json = await response.json();
    let content = json.choices[0].message.content.trim();

    const s = content.indexOf('{');
    const e = content.lastIndexOf('}');
    if (s !== -1 && e !== -1) {
      content = content.substring(s, e + 1);
    }

    const parsedData = JSON.parse(content);
    return res.status(200).json({ status: "success", data: parsedData });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
}