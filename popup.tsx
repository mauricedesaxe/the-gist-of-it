import { useEffect, useState } from "react"

function IndexPopup() {
  const [openAIKey, setOpenAIKey] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  const [summary, setSummary] = useState("")

  useEffect(() => {
    // Load saved API key on mount
    chrome.storage.local.get(["openAIKey", "currentSummary"], (result) => {
      if (result.openAIKey) {
        setOpenAIKey(result.openAIKey)
      }
      if (result.currentSummary) {
        setSummary(result.currentSummary)
      }
    })

    // Listen for storage changes
    const handleStorageChange = (changes, namespace) => {
      if (namespace === "local" && changes.currentSummary) {
        setSummary(changes.currentSummary.newValue)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value
    setOpenAIKey(newKey)
    chrome.storage.local.set({ openAIKey: newKey })
  }

  const clearApiKey = () => {
    setOpenAIKey("")
    chrome.storage.local.remove("openAIKey")
  }

  return (
    <>
      <div
        style={{
          backgroundColor: "#f9f9f9",
          padding: 16,
          borderRadius: 4
        }}>
        <h2>The Gist of It</h2>
        <p>
          Put your OpenAI API key below, then right click on any text and use
          "Key Points" to summarize it.
        </p>
      </div>
      <div style={{ padding: 16, minWidth: 220 }}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="apiKey" style={{ display: "block", marginBottom: 8 }}>
            OpenAI API Key:
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="apiKey"
              type={isVisible ? "text" : "password"}
              value={openAIKey}
              onChange={handleKeyChange}
              style={{
                width: "100%",
                borderRadius: 4,
                padding: 4,
                border: "1px solid #ccc",
                outline: "none",
                fontSize: 14,
                fontFamily: "monospace",
                boxSizing: "border-box",
                height: 32
              }}
              placeholder="Enter your OpenAI API key"
            />
            <button
              onClick={() => setIsVisible(!isVisible)}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid #ccc"
              }}>
              {isVisible ? "Hide" : "Show"}
            </button>
          </div>
          <button
            onClick={clearApiKey}
            style={{
              marginTop: 8,
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              cursor: "pointer"
            }}>
            Clear API Key
          </button>
          {summary && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                backgroundColor: "#f0f0f0",
                borderRadius: 4,
                border: "1px solid #ddd"
              }}>
              <h3 style={{ margin: "0 0 8px 0" }}>Summary</h3>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{summary}</p>
            </div>
          )}
          <div
            className="warning"
            style={{
              backgroundColor: "#fff3cd",
              color: "#856404",
              padding: 8,
              borderRadius: 4,
              marginTop: 8,
              fontSize: 12
            }}>
            Note: Your API key is stored locally on your device. Never share
            your API key with others.
          </div>
        </div>
      </div>
    </>
  )
}

export default IndexPopup
