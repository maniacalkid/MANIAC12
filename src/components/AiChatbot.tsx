import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Bot, ExternalLink, Play, RotateCcw, Send, X } from 'lucide-react';
import type { ChatMessage, ChatSource, GameItem, SuggestedGame } from '../types';
import { IS_STANDALONE, chatStandalone } from '../utils/runtime';

interface AiChatbotProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onLaunchGameById: (id: number) => void;
  gamesCount: number;
  games: GameItem[];
}

const STARTER_PROMPTS = [
  'explain black holes like im 5',
  'write me a clean python script',
  'quiz me on random trivia',
  'put me on 3 crazy action games',
];

export function AiChatbot({
  isOpen,
  onToggle,
  onLaunchGameById,
  gamesCount,
  games,
}: AiChatbotProps) {
  const welcomeMessage: ChatMessage = {
    id: 'welcome',
    role: 'model',
    text: `yooo im the maniac12 ai bestie. ask me literally anything—homework, code, trivia, random thoughts, or which of our ${gamesCount} games to play rn.`,
  };

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      if (IS_STANDALONE) {
        const standaloneResult = await chatStandalone(trimmed, games);
        setMessages((prev) => [
          ...prev,
          {
            id: `m-${Date.now()}`,
            role: 'model',
            text: standaloneResult.reply,
            sources: standaloneResult.sources,
            suggestedGames: standaloneResult.suggestedGames,
          },
        ]);
      } else {
        const apiHistory = nextMessages
          .filter((m) => m.id !== 'welcome' && !m.error)
          .map((m) => ({ role: m.role, text: m.text }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiHistory }),
        });

        const data = (await res.json()) as {
          reply?: string;
          sources?: ChatSource[];
          suggestedGames?: SuggestedGame[];
          error?: string;
        };

        if (!res.ok || data.error) {
          setMessages((prev) => [
            ...prev,
            {
              id: `e-${Date.now()}`,
              role: 'model',
              text: (data.error || 'couldnt reach the ai rn ngl.').toLowerCase(),
              error: true,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `m-${Date.now()}`,
              role: 'model',
              text: (data.reply || 'no reply came thru ngl.').toLowerCase(),
              sources: data.sources,
              suggestedGames: data.suggestedGames,
            },
          ]);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'model',
          text: 'network error while texting the ai rn.',
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Dock Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="chat-dock-button"
            type="button"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.9 }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.05, y: -2 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.93 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 360, damping: 20 }
            }
            onClick={() => onToggle(true)}
            aria-label="open maniac12 ai bestie"
            className="fixed bottom-5 right-5 z-40 h-12 px-5 rounded-2xl liquid-glass-strong inline-flex items-center gap-2.5 text-sm font-semibold shadow-2xl cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 lowercase"
            style={{ color: 'var(--text-primary)' }}
          >
            <Bot
              className="w-5 h-5"
              style={{ color: 'var(--accent-primary)' }}
              aria-hidden="true"
            />
            <span>ai bestie</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide-Up Liquid Glass Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="chat-drawer"
            aria-label="MANIAC12 AI Assistant"
            initial={
              prefersReducedMotion
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: 32, scale: 0.94 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 24, scale: 0.95 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 330, damping: 24 }
            }
            className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[400px] h-[540px] max-h-[82vh] z-40 rounded-3xl liquid-glass-strong flex flex-col overflow-hidden"
          >
          {/* Header */}
          <div
            className="px-5 py-3.5 border-b flex items-center justify-between gap-3"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background:
                    'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  color: 'var(--accent-contrast)',
                }}
              >
                <Bot className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2
                  className="text-sm font-semibold truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  ai bestie
                </h2>
                <p
                  className="text-xs truncate"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ask literally anything · school, code, trivia & games
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setMessages([welcomeMessage])}
                  aria-label="clear chat history"
                  title="new chat"
                  className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggle(false)}
                aria-label="close ai bestie"
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={
                  prefersReducedMotion
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: 10, scale: 0.96 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 360, damping: 24 }
                }
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className="max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={
                    msg.role === 'user'
                      ? {
                          background:
                            'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                          color: 'var(--accent-contrast)',
                        }
                      : {
                          backgroundColor: msg.error
                            ? 'rgba(239, 68, 68, 0.16)'
                            : 'rgba(128, 128, 128, 0.14)',
                          border: `1px solid ${
                            msg.error
                              ? 'rgba(239, 68, 68, 0.4)'
                              : 'var(--glass-border)'
                          }`,
                          color: 'var(--text-primary)',
                        }
                  }
                >
                  {msg.text}
                </div>

                {/* Grounded Web Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 w-[88%] flex flex-wrap gap-1.5">
                    {msg.sources.map((src) => (
                      <a
                        key={src.url}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] hover:bg-white/10 max-w-full"
                        style={{
                          borderColor: 'var(--glass-border)',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        <span className="truncate">{src.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Clickable Quick-Launch Game Suggestions */}
                {msg.suggestedGames && msg.suggestedGames.length > 0 && (
                  <div className="mt-2 w-[88%] flex flex-col gap-1.5">
                    {msg.suggestedGames.map((sg) => (
                      <button
                        key={sg.id}
                        type="button"
                        onClick={() => onLaunchGameById(sg.id)}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left transition-colors hover:bg-white/10 cursor-pointer"
                        style={{
                          borderColor: 'var(--glass-border)',
                          backgroundColor: 'rgba(128, 128, 128, 0.08)',
                        }}
                      >
                        <div className="min-w-0">
                          <div
                            className="text-xs font-semibold truncate"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {sg.name}
                          </div>
                          <div
                            className="text-[11px] truncate"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {sg.category}
                          </div>
                        </div>
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0"
                          style={{
                            backgroundColor: 'var(--accent-primary)',
                            color: 'var(--accent-contrast)',
                          }}
                        >
                          <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                          play
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <div className="flex items-start">
                <div
                  className="rounded-2xl px-3.5 py-2.5 text-xs border"
                  style={{
                    borderColor: 'var(--glass-border)',
                    backgroundColor: 'rgba(128, 128, 128, 0.1)',
                    color: 'var(--text-muted)',
                  }}
                >
                  thinking fr...
                </div>
              </div>
            )}
          </div>

          {/* Starter Prompts (shown when conversation has only welcome message) */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="px-2.5 py-1.5 rounded-xl border text-xs transition-colors hover:bg-white/10 cursor-pointer"
                  style={{
                    borderColor: 'var(--glass-border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-3 border-t flex items-center gap-2"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ask anything rn..."
              aria-label="chat message"
              className="flex-1 h-10 px-3.5 rounded-xl border bg-transparent text-sm focus:outline-none lowercase"
              style={{
                borderColor: 'var(--glass-border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-opacity disabled:opacity-45 cursor-pointer"
              style={{
                background:
                  'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: 'var(--accent-contrast)',
              }}
            >
              <Send className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </motion.aside>
      )}
      </AnimatePresence>
    </>
  );
}
