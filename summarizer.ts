import OpenAI from "openai"

// Get summary of text using OpenAI
export async function extractKeyPoints(
  text: string,
  apiKey: string
): Promise<string> {
  if (!text?.trim()) {
    throw new Error("Empty or invalid input text")
  }
  if (!apiKey?.trim()) {
    throw new Error("Invalid API key")
  }

  // Split text if too big
  const MAX_WORDS = 12_000
  const words = text.split(/\s+/)

  // Text small enough, just summarize it
  if (words.length <= MAX_WORDS) {
    return await summarizeText(text, apiKey)
  }

  // Text too big, split into chunks and summarize each
  const chunks = []
  for (let i = 0; i < words.length; i += MAX_WORDS) {
    const chunk = words
      .slice(i, Math.min(i + MAX_WORDS, words.length))
      .join(" ")
    chunks.push(chunk)
  }

  // Get summary for each chunk
  const summaries = []
  for (const chunk of chunks) {
    const summary = await summarizeText(chunk, apiKey)
    summaries.push(summary)
  }

  // If multiple summaries, combine them
  if (summaries.length > 1) {
    const combinedText = summaries.join("\n\n")
    return await summarizeText(combinedText, apiKey)
  }

  return summaries[0]
}

// Get summary from OpenAI
async function summarizeText(text: string, apiKey: string): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey })

    // Count words to decide prompt
    const wordCount = text.split(/\s+/).length
    const prompt = makePrompt(wordCount)

    // Ask OpenAI for summary
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text }
      ],
      temperature: 0.2,
      max_tokens: getMaxTokens(wordCount),
      presence_penalty: -0.2,
      frequency_penalty: 0.3
    })

    const summary = response.choices[0].message.content
    if (!summary) {
      throw new Error("OpenAI gave empty response")
    }

    // Get text between <summary> tags
    const match = summary.match(/<summary>(.*?)<\/summary>/s)
    if (!match) {
      throw new Error("OpenAI response missing summary tags")
    }

    return match[1].trim()
  } catch (error) {
    throw new Error(
      "OpenAI error: " +
        (error instanceof Error ? error.message : "Unknown error")
    )
  }
}

// Make prompt based on text length
function makePrompt(wordCount: number): string {
  // Long text
  if (wordCount > 500) {
    return `Summarize this long text. Give key points and 3-4 sentence overview.

Format like this:
KEY POINTS:
• [point 1]
• [point 2]
...
<summary>[overview]</summary>

Rules:
- Keep important details and numbers
- Use same style and terms as original
- Only include what's in the text
- Focus on main points`
  }

  // Medium text
  if (wordCount >= 100) {
    return `Summarize this medium text. Give main points.

Format like this:
<summary>
• [point 1]
• [point 2]
</summary>

Rules:
- Keep important details and numbers
- Use same style and terms as original
- Only include what's in the text
- Focus on main points`
  }

  // Short text
  return `Summarize this short text in one sentence.

Format like this:
<summary>[summary]</summary>

Rules:
- Keep important details and numbers
- Use same style and terms as original
- Only include what's in the text
- Focus on main point`
}

// Get max tokens based on text length
function getMaxTokens(wordCount: number): number {
  // For very short text (<200 words), allow more tokens relative to input
  // to ensure good quality summary. For longer text, use fewer tokens
  // to keep response concise while still capturing key points
  const ratio = wordCount < 200 ? 0.75 : 0.5
  const calculatedTokens = Math.ceil(wordCount * ratio)

  // Cap at 2000 tokens to stay within API limits
  // and avoid unnecessarily long responses
  return Math.min(calculatedTokens, 2000)
}
