// Function to extract key points from text using OpenAI's API
async function extractKeyPoints(text: string, apiKey: string): Promise<string> {
  try {
    // Make API request to OpenAI chat completions endpoint
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          // System message to instruct the AI how to summarize
          {
            role: "system",
            content:
              "You are a highly efficient summarizer. Your goal is to provide extremely concise summaries that scale with input length. For short texts (under 100 words), give a 1-sentence summary. For medium texts (100-500 words), give 2-3 key points. For longer texts, never exceed 4-5 key points. Always prioritize the most impactful information. Be ruthlessly brief - shorter is better."
          },
          // User message containing the text to summarize
          {
            role: "user",
            content: `Summarize this text as concisely as possible, scaling summary length to input length: \n\n${text}`
          }
        ],
        temperature: 0.5, // Lower temperature for more focused responses
        max_tokens: 250 // Reduced max tokens to encourage brevity
      })
    })

    const data = await response.json()

    // Check if the API request was successful
    if (!response.ok) {
      throw new Error(data.error?.message || "API request failed")
    }

    // Validate response format
    if (!data.choices?.[0]?.message?.content) {
      throw new Error("Invalid API response format")
    }

    return data.choices[0].message.content
  } catch (error) {
    // Handle and rethrow errors with more context
    if (error instanceof Error) {
      throw new Error(`OpenAI API Error: ${error.message}`)
    }
    throw new Error("An unexpected error occurred")
  }
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
        title: "Extract Key Points",
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
