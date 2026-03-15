import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const API = "http://localhost:8000";

// ─────────────────────────────────────────────────────────────
//  Small helper components
// ─────────────────────────────────────────────────────────────

function Spinner() {
  return <span className="spinner" aria-label="loading" />;
}

function SourceCard({ source, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="source-card">
      <button className="source-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="source-badge">{index + 1}</span>
        <span className="source-filename">{source.filename}</span>
        <span className="source-sim">
          {(source.similarity * 100).toFixed(1)}% match
        </span>
        <span className="source-chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && <p className="source-text">{source.text}</p>}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`message ${isUser ? "message--user" : "message--bot"}`}>
      <div className="message__avatar">{isUser ? "You" : "AI"}</div>
      <div className="message__body">
        <p className="message__text">{msg.content}</p>
        {msg.sources && msg.sources.length > 0 && (
          <div className="message__sources">
            <p className="sources-label">📎 Sources retrieved from Endee</p>
            {msg.sources.map((s, i) => (
              <SourceCard key={i} source={s} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main App
// ─────────────────────────────────────────────────────────────

function App() {
  const [documents, setDocuments]     = useState([]);
  const [messages, setMessages]       = useState([]);
  const [question, setQuestion]       = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [querying, setQuerying]       = useState(false);
  const [toast, setToast]             = useState(null);
  const [dragOver, setDragOver]       = useState(false);

  const fileRef    = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    checkBackendHealth();
    fetchDocuments();

    const intervalId = setInterval(checkBackendHealth, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const showToast = useCallback((type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  function getFriendlyError(err, fallback) {
    if (err?.name === "TypeError" || /failed to fetch/i.test(err?.message || "")) {
      return "Cannot reach the backend at http://localhost:8000. Start the FastAPI API and Endee, then try again.";
    }
    return err?.message || fallback;
  }

  async function checkBackendHealth() {
    try {
      const res = await fetch(`${API}/health`);
      setBackendOnline(res.ok);
      return res.ok;
    } catch {
      setBackendOnline(false);
      return false;
    }
  }

  async function fetchDocuments() {
    try {
      const res = await fetch(`${API}/documents`);
      if (!res.ok) throw new Error();
      setBackendOnline(true);
      setDocuments(await res.json());
    } catch {
      setBackendOnline(false);
    }
  }

  async function uploadFile(file) {
    if (backendOnline === false) {
      showToast("error", "❌ Backend is offline. Start the FastAPI server on http://localhost:8000 first.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch(`${API}/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed.");
      setBackendOnline(true);
      showToast("success", `✅ "${data.filename}" ingested — ${data.total_chunks} chunks stored in Endee.`);
      await fetchDocuments();
    } catch (err) {
      setBackendOnline(false);
      showToast("error", `❌ ${getFriendlyError(err, "Upload failed.")}`);
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(docId) {
    try {
      const res = await fetch(`${API}/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      setBackendOnline(true);
      showToast("success", "🗑️ Document removed from Endee.");
      if (selectedDoc === docId) setSelectedDoc(null);
      await fetchDocuments();
    } catch (err) {
      setBackendOnline(false);
      showToast("error", `❌ ${getFriendlyError(err, "Delete failed.")}`);
    }
  }

  async function sendQuestion(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || querying) return;

    if (backendOnline === false) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "Backend is offline. Start the FastAPI API on http://localhost:8000 and make sure Endee is running before asking questions.",
          sources: [],
        },
      ]);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setQuerying(true);

    try {
      const res  = await fetch(`${API}/query`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question: q, top_k: 5, doc_id: selectedDoc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Query failed.");
      setBackendOnline(true);
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: data.answer, sources: data.sources },
      ]);
    } catch (err) {
      setBackendOnline(false);
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: `Error: ${getFriendlyError(err, "Query failed.")}`, sources: [] },
      ]);
    } finally {
      setQuerying(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="brand-icon">🧠</span>
          <span className="brand-name">DocuMind</span>
        </div>

        <div
          className={`upload-zone${dragOver ? " upload-zone--drag" : ""}${uploading ? " upload-zone--busy" : ""}${backendOnline === false ? " upload-zone--disabled" : ""}`}
          onClick={() => !uploading && backendOnline !== false && fileRef.current?.click()}
          onDragOver={(e) => {
            if (backendOnline === false) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {uploading ? (
            <><Spinner /><span>Ingesting into Endee…</span></>
          ) : backendOnline === false ? (
            <>
              <span className="upload-icon">⚠️</span>
              <span>Upload unavailable</span>
              <span className="upload-hint">Backend not reachable on localhost:8000</span>
            </>
          ) : (
            <>
              <span className="upload-icon">📂</span>
              <span>Drop file or click to upload</span>
              <span className="upload-hint">PDF · TXT · MD</span>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md,.rst,.csv"
          style={{ display: "none" }}
          disabled={backendOnline === false}
          onChange={(e) => e.target.files[0] && uploadFile(e.target.files[0])}
        />

        <div className="doc-list">
          <p className="doc-list__heading">Documents ({documents.length})</p>
          {documents.length === 0 && (
            <p className="doc-list__empty">No documents ingested yet.</p>
          )}
          <button
            className={`doc-item${selectedDoc === null ? " doc-item--active" : ""}`}
            onClick={() => setSelectedDoc(null)}
          >
            <span>🔍 Search all</span>
          </button>
          {documents.map((doc) => (
            <div
              key={doc.doc_id}
              className={`doc-item${selectedDoc === doc.doc_id ? " doc-item--active" : ""}`}
            >
              <button
                className="doc-item__name"
                onClick={() =>
                  setSelectedDoc((prev) => prev === doc.doc_id ? null : doc.doc_id)
                }
              >
                <span className="doc-icon">📄</span>
                <span className="doc-label" title={doc.filename}>
                  {doc.filename.length > 22
                    ? doc.filename.slice(0, 20) + "…"
                    : doc.filename}
                </span>
                <span className="doc-chunks">{doc.total_chunks}c</span>
              </button>
              <button
                className="doc-item__del"
                title="Delete"
                onClick={() => deleteDocument(doc.doc_id)}
              >×</button>
            </div>
          ))}
        </div>

        <div className="sidebar__footer">
          Vector DB:{" "}
          <a href="https://github.com/endee-io/endee" target="_blank" rel="noreferrer">
            Endee
          </a>
        </div>
      </aside>

      {/* ── Chat ── */}
      <main className="chat">
        <header className="chat__header">
          <div>
            <h1 className="chat__title">DocuMind — AI Document Q&amp;A</h1>
            <p className="chat__subtitle">
              {selectedDoc
                ? `📄 Focused on: ${documents.find((d) => d.doc_id === selectedDoc)?.filename ?? selectedDoc}`
                : "🔍 Searching across all documents"}
            </p>
            {backendOnline === false && (
              <div className="status-banner status-banner--error">
                Backend unavailable at http://localhost:8000. File upload and Q&amp;A will fail until the API and Endee are started.
              </div>
            )}
            {backendOnline === true && (
              <div className="status-banner status-banner--ok">
                Backend connected. Uploads and queries are available.
              </div>
            )}
          </div>
        </header>

        <div className="chat__messages">
          {messages.length === 0 && (
            <div className="chat__empty">
              <span className="empty-icon">💬</span>
              <p>Upload a document and ask anything about it.</p>
              <p className="empty-hint">
                DocuMind chunks your documents, creates embeddings with
                sentence-transformers, stores them in{" "}
                <strong>Endee's vector database</strong>, and retrieves
                the most relevant passages to answer your questions.
              </p>
            </div>
          )}

          {messages.map((msg, i) => <Message key={i} msg={msg} />)}

          {querying && (
            <div className="message message--bot">
              <div className="message__avatar">AI</div>
              <div className="message__body">
                <span className="thinking"><Spinner /> Searching Endee &amp; generating answer…</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form className="chat__input-bar" onSubmit={sendQuestion}>
          <input
            ref={inputRef}
            className="chat__input"
            type="text"
            placeholder="Ask a question about your documents…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={querying || backendOnline === false}
          />
          <button
            className="chat__send"
            type="submit"
            disabled={!question.trim() || querying || backendOnline === false}
          >
            {querying ? <Spinner /> : "Send ↩"}
          </button>
        </form>
      </main>

      {toast && (
        <div className={`toast toast--${toast.type}`}>{toast.text}</div>
      )}
    </div>
  );
}

export default App;
