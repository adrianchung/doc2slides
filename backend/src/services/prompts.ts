export function buildExecutivePrompt(params: {
  content: string;
  slideCount: number;
  customPrompt?: string;
}): string {
  const { content, slideCount, customPrompt } = params;

  const basePrompt = `You are an expert at creating executive presentations. Your task is to analyze the following document and extract the most critical information for a ${slideCount}-slide presentation targeting tech company executives.

REQUIREMENTS:
1. Create exactly ${slideCount} slides (not including the title slide)
2. Each slide must have:
   - A clear, concise title (max 8 words)
   - 3-5 bullet points (max 15 words each)
3. Focus on:
   - Key decisions and recommendations
   - Quantifiable metrics, outcomes, and KPIs
   - Strategic implications and business impact
   - Action items and next steps
4. Executives have limited time - every word must earn its place
5. Lead with the most important information (inverted pyramid)
6. Use active voice and strong verbs
7. Avoid jargon unless industry-standard

${customPrompt ? `ADDITIONAL INSTRUCTIONS FROM USER:\n${customPrompt}\n` : ""}

DOCUMENT CONTENT:
${content}

OUTPUT FORMAT:
Respond with valid JSON only, no markdown code blocks. Use this exact structure:
{
  "slides": [
    {
      "title": "Slide Title Here",
      "bullets": [
        "First key point",
        "Second key point",
        "Third key point"
      ]
    }
  ]
}`;

  return basePrompt;
}
