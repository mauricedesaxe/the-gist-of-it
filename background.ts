// Add these constants at the top of the file
const MAX_CHUNK_SIZE = 12000 // Conservative limit for GPT-4's context window
const OVERLAP_SIZE = 500 // Words to overlap between chunks for context continuity

// Helper function to split text into chunks
function splitIntoChunks(text: string): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += MAX_CHUNK_SIZE - OVERLAP_SIZE) {
    const chunk = words.slice(i, i + MAX_CHUNK_SIZE).join(" ")
    chunks.push(chunk)
  }

  return chunks
}

// Function to extract key points from text using OpenAI's API
async function extractKeyPoints(text: string, apiKey: string): Promise<string> {
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

// Helper function to process individual chunks
async function processChunk(text: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert summarizer with years of experience in content analysis and technical writing. " +
            "Your summaries are known for being clear, concise, and capturing the essence of the text while maintaining accuracy.\n\n" +
            "OUTPUT RULES:\n" +
            "1. For texts > 500 words:\n" +
            "```\n" +
            "KEY POINTS:\n" +
            "• [key point 1]\n" +
            "• [key point 2]\n" +
            "...\n" +
            "<summary>[3-4 sentence summary here]</summary>\n" +
            "```\n\n" +
            "2. For texts 100-500 words:\n" +
            "```\n" +
            "<summary>\n" +
            "• [key point 1]\n" +
            "• [key point 2]\n" +
            "</summary>\n" +
            "```\n\n" +
            "3. For texts < 100 words:\n" +
            "```\n" +
            "<summary>[single sentence summary]</summary>\n" +
            "```\n\n" +
            "GUIDELINES:\n" +
            "- Focus on actionable insights and key takeaways\n" +
            "- Maintain original tone (formal/casual/technical)\n" +
            "- Preserve important technical details and numbers\n" +
            "- Use original terminology when domain-specific\n" +
            "- Exclude redundant or obvious information\n" +
            "- Never add information not present in original text"
        },
        {
          role: "user",
          content:
            "Here's the text to analyze. Word count: " +
            text.split(/\s+/).length +
            "\n\n" +
            text
        }
      ],
      temperature: 0.2,
      max_tokens: 350,
      presence_penalty: -0.2, // Slight penalty to prevent adding information
      frequency_penalty: 0.3
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || "API request failed")
  }

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("Invalid API response format")
  }

  // Extract just the summary section
  const content = data.choices[0].message.content
  const summaryMatch = content.match(/<summary>(.*?)<\/summary>/s)
  if (!summaryMatch) {
    throw new Error("Response did not contain a properly formatted summary")
  }

  return summaryMatch[1].trim()
}

// Add this helper function at the top of the file
async function openPopup() {
  // Get the current window
  const window = await chrome.windows.getCurrent()

  // Get all tabs in the current window
  const tabs = await chrome.tabs.query({ active: true, windowId: window.id })

  if (tabs[0]) {
    // Show the extension's popup
    await chrome.action.openPopup()
  }
}

// Set up context menu when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed/updated")

  // Remove any existing context menu items and create new one
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        id: "extract-key-points-selection",
        title: "Get the Gist of It",
        contexts: ["selection"] // Only show menu on text selection
      },
      () => {
        // Log success or failure of context menu creation
        if (chrome.runtime.lastError) {
          console.error(
            "Error creating context menu:",
            chrome.runtime.lastError
          )
        } else {
          console.log("Context menu created successfully")
        }
      }
    )
  })
})

// Handle clicks on the context menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (
    info.menuItemId === "extract-key-points-selection" &&
    info.selectionText &&
    tab.id
  ) {
    try {
      // Set loading state and open popup immediately
      await chrome.storage.local.set({ isLoading: true })
      await openPopup()

      const result = await chrome.storage.local.get("openAIKey")
      if (!result.openAIKey) {
        throw new Error(
          "Please enter your OpenAI API key in the extension popup"
        )
      }

      const summary = await extractKeyPoints(
        info.selectionText,
        result.openAIKey
      )

      // Update storage with summary and clear loading state
      await chrome.storage.local.set({
        currentSummary: summary,
        isLoading: false
      })
    } catch (error) {
      console.error("Error generating summary:", error)
      // Store error and clear loading state
      await chrome.storage.local.set({
        currentSummary: `Error: ${error.message}`,
        isLoading: false
      })
    }
  }
})

// Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SUMMARIZE_TEXT") {
    ;(async () => {
      try {
        const result = await chrome.storage.local.get("openAIKey")
        const summary = await extractKeyPoints(message.text, result.openAIKey)

        // Send summary to popup
        chrome.runtime.sendMessage({
          type: "UPDATE_SUMMARY",
          summary
        })

        sendResponse({ success: true, summary })
      } catch (error) {
        console.error("Error generating summary:", error)
        // Store error in storage instead of sending message
        await chrome.storage.local.set({
          currentSummary: `Error: ${error.message}`
        })
        await openPopup()
        sendResponse({ success: false, error: error.message })
      }
    })()
    return true
  }
})
