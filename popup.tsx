import { useEffect, useState } from "react"

function IndexPopup() {
  const [openAIKey, setOpenAIKey] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  const [summary, setSummary] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Load saved API key and states on mount
    chrome.storage.local.get(
      ["openAIKey", "currentSummary", "isLoading"],
      (result) => {
        if (result.openAIKey) {
          setOpenAIKey(result.openAIKey)
        }
        if (result.currentSummary) {
          setSummary(result.currentSummary)
        }
        setIsLoading(!!result.isLoading)
      }
    )

    // Listen for storage changes
    const handleStorageChange = (changes, namespace) => {
      if (namespace === "local") {
        if (changes.currentSummary) {
          setSummary(changes.currentSummary.newValue)
        }
        if (changes.isLoading) {
          setIsLoading(changes.isLoading.newValue)
        }
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

  // Add loading spinner component between the API key input and summary
  const LoadingSpinner = () => (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        backgroundColor: "#f0f0f0",
        borderRadius: 4,
        border: "1px solid #ddd",
        textAlign: "center"
      }}>
      <div
        style={{
          display: "inline-block",
          width: 20,
          height: 20,
          border: "2px solid #ccc",
          borderTopColor: "#333",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <p style={{ marginTop: 8, marginBottom: 0 }}>Generating summary...</p>
    </div>
  )

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
      <div style={{ padding: 16, minWidth: 420 }}>
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
          {isLoading ? (
            <LoadingSpinner />
          ) : summary ? (
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
          ) : null}
        </div>
      </div>
    </>
  )
}

export default IndexPopup
