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
              "I'll show you some text, you summarize it / extract 1-2 key points. Focus on high-level, focus on high-impact. It's better to remove, than to keep it long. Try to keep your summaries as short as possible. Here it goes:"
          },
          // User message containing the text to summarize
          {
            role: "user",
            content: `Please summarize the following text into key points: \n\n${text}`
          }
        ],
        temperature: 0.7, // Controls randomness of output
        max_tokens: 500 // Maximum length of response
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
  // Only proceed if it's our menu item, has selected text, and a valid tab
  if (
    info.menuItemId === "extract-key-points-selection" &&
    info.selectionText &&
    tab.id
  ) {
    try {
      // Get OpenAI API key from storage
      const result = await chrome.storage.local.get("openAIKey")
      // Generate summary from selected text
      const summary = await extractKeyPoints(
        info.selectionText,
        result.openAIKey
      )

      // Show summary in an alert in the active tab
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (summaryText) => {
          alert(summaryText)
        },
        args: [summary]
      })
    } catch (error) {
      console.error("Error generating summary:", error)
      // Show error message in an alert if something goes wrong
      if (tab.id) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (errorMsg) => {
            alert(`Error: ${errorMsg}`)
          },
          args: [error.message]
        })
      }
    }
  }
})

// Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SUMMARIZE_TEXT") {
    // Handle the message asynchronously using an IIFE
    ;(async () => {
      try {
        // Get API key and generate summary
        const result = await chrome.storage.local.get("openAIKey")
        const summary = await extractKeyPoints(message.text, result.openAIKey)

        // Show summary in an alert if we have a valid tab
        if (sender.tab?.id) {
          await chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            func: (summaryText) => {
              alert(summaryText)
            },
            args: [summary]
          })
        }
        sendResponse({ success: true, summary })
      } catch (error) {
        console.error("Error generating summary:", error)
        sendResponse({ success: false, error: error.message })
      }
    })()
    return true // Keep the message channel open for async response
  }
})
