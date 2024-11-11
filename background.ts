chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed/updated")

  // Remove existing menu items to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Create the new menu item
    chrome.contextMenus.create(
      {
        id: "log-selection",
        title: "Log Selection",
        contexts: ["selection"]
      },
      () => {
        // Check for any creation errors
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Context menu clicked", info)
  if (info.menuItemId === "log-selection" && info.selectionText) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text) => {
        chrome.storage.local.get("openAIKey", (result) => {
          console.log(text, result.openAIKey)
        })
      },
      args: [info.selectionText]
    })
  }
})
