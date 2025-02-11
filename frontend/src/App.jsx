import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./index.css";

function App() {
  const [query, setQuery] = useState("");
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null); // State for modal content

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:3000/search", { query });
      setResponses([...responses, { query, results: res.data }]);
    } catch (error) {
      console.error("Search failed", error);
    }
    setLoading(false);
    setQuery("");
  };

  return (
    <div className="container">
      <h2>Helpdesk Chatbot</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question..."
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Ask"}
        </button>
      </form>

      {loading && <p className="loading">Searching for answers...</p>}

      <div>
        {responses.map((entry, index) => (
          <div key={index} className="response">
            <strong>Q:</strong> {entry.query}
            {entry.results.length > 0 ? (
              entry.results
                .sort((a, b) => (b.score || 0) - (a.score || 0)) // Sort by highest score first
                .map((result, i) => (
                  <div key={i} className="result-preview">
                    <p>
                      <strong>
                        Rank #{i + 1}
                        {typeof result.score === "number"
                          ? ` (Score: ${result.score.toFixed(3)})`
                          : " (No score available)"}
                      </strong>
                    </p>
                    <ReactMarkdown>
                      {typeof result.content === "string"
                        ? `${result.content.substring(0, 100)}...`
                        : "Preview not available"}
                    </ReactMarkdown>
                    <button
                      onClick={() => setSelectedDocument(result)}
                      className="read-more"
                    >
                      Read More
                    </button>
                  </div>
                ))
            ) : (
              <p>No results found.</p>
            )}
          </div>
        ))}
      </div>

      {/* Modal for full document */}
      {selectedDocument && (
        <div className="modal-overlay" onClick={() => setSelectedDocument(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setSelectedDocument(null)}>
              ✖
            </button>
            <h3>Document</h3>
            <ReactMarkdown>
              {typeof selectedDocument.content === "string"
                ? selectedDocument.content
                : JSON.stringify(selectedDocument.content)}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
