import { extractKeyPoints } from "~summarizer"

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
