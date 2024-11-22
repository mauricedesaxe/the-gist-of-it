import OpenAI from "openai"

// Function to extract key points from text using OpenAI's API
export async function extractKeyPoints(
  text: string,
  apiKey: string
): Promise<string> {
  try {
    const chunks = splitIntoChunks(text)

    // If text fits in one chunk, process normally
    if (chunks.length === 1) {
      return await processChunk(chunks[0], apiKey)
    }

    // For multiple chunks, process each and combine
    const summaries = await Promise.all(
      chunks.map((chunk) => processChunk(chunk, apiKey))
    )

    // If we had multiple chunks, summarize the summaries
    if (summaries.length > 1) {
      const combinedSummary = summaries.join("\n\n")
      return await processChunk(
        `Combine these summaries into one coherent summary:\n\n${combinedSummary}`,
        apiKey
      )
    }

    return summaries[0]
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API Error: ${error.message}`)
    }
    throw new Error("An unexpected error occurred")
  }
}

// Helper function to split text into chunks
function splitIntoChunks(text: string): string[] {
  const MAX_CHUNK_SIZE = 12000 // Conservative limit for GPT-4's context window
  const OVERLAP_SIZE = 500 // Words to overlap between chunks for context continuity

  const words = text.split(/\s+/)
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += MAX_CHUNK_SIZE - OVERLAP_SIZE) {
    const chunk = words.slice(i, i + MAX_CHUNK_SIZE).join(" ")
    chunks.push(chunk)
  }

  return chunks
}

// Helper function to process individual chunks
async function processChunk(text: string, apiKey: string): Promise<string> {
  const wordCount = text.split(/\s+/).length
  const systemPrompt = getSystemPrompt(wordCount)

  const openai = new OpenAI({ apiKey })

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: "Here's the text to analyze:\n\n" + text
      }
    ],
    temperature: 0.2,
    max_tokens: Math.min(Math.max(Math.floor(wordCount * 0.5), 350), 1000),
    presence_penalty: -0.2,
    frequency_penalty: 0.3
  })

  const content = completion.choices[0].message.content
  if (!content) {
    throw new Error("Invalid API response format")
  }

  // Extract just the summary section
  const summaryMatch = content.match(/<summary>(.*?)<\/summary>/s)
  if (!summaryMatch) {
    throw new Error("Response did not contain a properly formatted summary")
  }

  return summaryMatch[1].trim()
}

// Helper function to get system prompt based on word count
function getSystemPrompt(wordCount: number): string {
  let systemPrompt = ""
  if (wordCount > 500) {
    systemPrompt =
      "You are an expert summarizer specializing in long-form content analysis. " +
      "Create a comprehensive yet concise summary with key points and a 3-4 sentence overview.\n\n" +
      "OUTPUT FORMAT:\n" +
      "```\n" +
      "KEY POINTS:\n" +
      "• [key point 1]\n" +
      "• [key point 2]\n" +
      "...\n" +
      "<summary>[3-4 sentence summary here]</summary>\n" +
      "```"
  } else if (wordCount >= 100) {
    systemPrompt =
      "You are an expert summarizer specializing in medium-length content. " +
      "Extract the main points while maintaining the original tone and terminology.\n\n" +
      "OUTPUT FORMAT:\n" +
      "```\n" +
      "<summary>\n" +
      "• [key point 1]\n" +
      "• [key point 2]\n" +
      "</summary>\n" +
      "```"
  } else {
    systemPrompt =
      "You are an expert summarizer specializing in concise content. " +
      "Distill the essence into a single clear sentence.\n\n" +
      "OUTPUT FORMAT:\n" +
      "```\n" +
      "<summary>[single sentence summary]</summary>\n" +
      "```"
  }

  // Add common guidelines to all prompts
  systemPrompt +=
    "\n\nGUIDELINES:\n" +
    "- Focus on actionable insights and key takeaways\n" +
    "- Maintain original tone (formal/casual/technical)\n" +
    "- Preserve important technical details and numbers\n" +
    "- Use original terminology when domain-specific\n" +
    "- Exclude redundant or obvious information\n" +
    "- Never add information not present in original text"

  return systemPrompt
}
