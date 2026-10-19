// src/components/ChatWidget.tsx
import React, { useState } from "react";
import { aiService } from "../services/api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  from: "user" | "ai";
  text: string;
}

interface ChatWidgetProps {
  projectId: string;
  inline?: boolean;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  projectId,
  inline = false,
}) => {
  const [isOpen, setIsOpen] = useState(inline);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || !projectId) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      from: "user",
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await aiService.chatWithAI(projectId, userMsg.text);
      const aiText = response.data.answer;
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        from: "ai",
        text: aiText,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        from: "ai",
        text: "The AI is unavailable or took too long to respond. Please try again.",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  // INLINE MODE (For Assets/Full Page view)
  if (inline) {
    return (
      <div className="w-full h-full flex flex-col rounded-2xl bg-slate-900 border border-slate-700">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-50">
            Project AI Assistant
          </span>
          <span className="text-[11px] text-slate-400">
            Project: {projectId || "none selected"}
          </span>
        </div>

        <div className="flex-1 px-4 py-3 overflow-y-auto space-y-2 text-xs">
          {messages.length === 0 && !loading && (
            <div className="text-slate-400 text-xs">
              Ask anything about your current project, tasks, deadlines, or risks.
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] px-3 py-2 rounded-lg whitespace-pre-wrap break-words ${
                m.from === "user"
                  ? "ml-auto bg-indigo-600 text-white"
                  : "mr-auto bg-slate-800 text-slate-50"
              }`}
            >
              {m.from === 'ai' ? (
                <div className="prose prose-invert prose-xs max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900/50">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.text}
                  </ReactMarkdown>
                </div>
              ) : (
                m.text
              )}
            </div>
          ))}
          {loading && (
            <div className="mr-auto max-w-[70%] px-3 py-2 rounded-lg bg-slate-800 italic text-slate-300">
              Thinking...
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-700 flex items-center gap-2">
          <input
            className="flex-1 text-xs px-3 py-2 rounded-md bg-slate-800 text-slate-50 outline-none border border-slate-700 focus:border-indigo-500"
            placeholder="Ask about project, tasks, assets..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSend}
            disabled={loading || !projectId}
            className="text-xs px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white"
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  // FLOATING WIDGET MODE (For Sidebar/Overlay)
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-4 w-80 h-96 rounded-xl bg-slate-900 text-slate-50 shadow-2xl flex flex-col border border-slate-700 animate-in fade-in slide-in-from-bottom-10 duration-200">
          <div className="px-4 py-3 flex items-center justify-between border-b border-slate-700 bg-slate-800/50 rounded-t-xl">
            <span className="text-sm font-semibold">AI Assistant</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 px-3 py-2 overflow-y-auto space-y-3 text-xs">
            {messages.length === 0 && !loading && (
              <div className="text-slate-400 text-center mt-4">
                <p>👋 Hi! I'm your Project Assistant.</p>
                <p className="mt-1">Ask me about overdue tasks, risks, or to summarize the project.</p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] px-3 py-2 rounded-lg whitespace-pre-wrap break-words ${
                  m.from === "user"
                    ? "ml-auto bg-primary text-white"
                    : "mr-auto bg-slate-800 text-slate-50 border border-slate-700"
                }`}
              >
                {m.from === 'ai' ? (
                  <div className="prose prose-invert prose-xs max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900/50">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  m.text
                )}
              </div>
            ))}
            {loading && (
              <div className="mr-auto max-w-[70%] px-3 py-2 rounded-lg bg-slate-800 italic text-slate-400 text-[10px] animate-pulse">
                Thinking...
              </div>
            )}
          </div>
          <div className="p-3 border-t border-slate-700 bg-slate-800/30 rounded-b-xl flex gap-2">
            <input
              className="flex-1 text-xs px-3 py-2 rounded-lg bg-slate-800 text-slate-50 outline-none border border-slate-700 focus:border-primary/50 transition-colors"
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={handleSend}
              disabled={loading || !projectId}
              className="p-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-white transition-colors"
            >
              🚀
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-secondary shadow-lg hover:shadow-primary/50 hover:scale-105 transition-all duration-200 flex items-center justify-center text-white text-2xl"
      >
        💬
      </button>
    </div>
  );
};
