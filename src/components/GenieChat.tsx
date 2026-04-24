import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, X, Send, Bot, User, 
  Lightbulb, ShieldAlert, FileSearch, RefreshCw, Mic, MicOff,
  PlayCircle, Scale, Zap, Brain 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  isStreaming?: boolean;
  action?: {
    type: 'mitigation';
    value: string;
  };
}

export function GenieChat() {
  const { currentAnalysis, genieState, triggerGenie, closeGenie } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your EquityLens Genie. I'm now powered by GPT-4o with real-time streaming. How can I help you analyze your fairness metrics today?",
      suggestions: ["Summarize current audit", "What are the risks?", "Check compliance"]
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const { currentAnalysis, genieState, triggerGenie, closeGenie } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize WebSocket
  useEffect(() => {
    if (isOpen && !socket) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = import.meta.env.VITE_API_WS_URL || 'localhost:8000';
      const ws = new WebSocket(`${protocol}//${host}/api/ai/chat`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'start') {
          setIsLoading(true);
          setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);
        } else if (data.type === 'chunk') {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.isStreaming) {
              lastMessage.content += data.content;
              
              // Check for mitigation tags
              const mitigationMatch = lastMessage.content.match(/\[APPLY_MITIGATION:(\w+)\]/);
              if (mitigationMatch) {
                lastMessage.action = {
                  type: 'mitigation',
                  value: mitigationMatch[1]
                };
                // Clean content
                lastMessage.content = lastMessage.content.replace(/\[APPLY_MITIGATION:\w+\]/, '');
              }
            }
            return newMessages;
          });
        } else if (data.type === 'end') {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage) {
              lastMessage.isStreaming = false;
            }
            return newMessages;
          });
          setIsLoading(false);
        } else if (data.type === 'error') {
          setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.message}` }]);
          setIsLoading(false);
        }
      };

      ws.onclose = () => {
        setSocket(null);
        console.log("WebSocket disconnected");
      };

      setSocket(ws);
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = (content: string) => {
    if (!content.trim() || isLoading || !socket) return;

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    const payload = {
      messages: messages.filter(m => !m.isStreaming).concat(userMessage).map(m => ({ role: m.role, content: m.content })),
      context: currentAnalysis
    };

    socket.send(JSON.stringify(payload));
  };

  const handleApplyMitigation = (type: string) => {
    const { addSimulation } = useAppStore.getState();
    const proxyFeature = currentAnalysis?.featureImportance?.find(f => f.isProxy)?.feature;
    
    addSimulation({
      id: `sim-${Date.now()}`,
      name: type,
      removedFeatures: type === 'feature_removal' ? (proxyFeature ? [proxyFeature] : []) : [],
      reweighted: type === 'reweighting',
      metrics: { 
        demographicParity: Math.min(1, (currentAnalysis?.metrics.demographicParity || 0.7) + 0.1), 
        equalOpportunity: Math.min(1, (currentAnalysis?.metrics.equalOpportunity || 0.7) + 0.08), 
        disparateImpact: Math.min(1, (currentAnalysis?.metrics.disparateImpact || 0.7) + 0.12), 
        overallScore: Math.min(100, (currentAnalysis?.metrics.overallScore || 70) + 10) 
      },
      groupMetrics: currentAnalysis?.groupMetrics || [],
    });

    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `I've successfully initialized the **${type.replace('_', ' ')}** simulation protocol. You can view the projected results in the 'Simulations' tab.` 
    }]);
  };

  const startSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
    };

    recognition.start();
  };

  // Sync with store
  useEffect(() => {
    if (genieState.isOpen) {
      setIsOpen(true);
      if (genieState.prompt) {
        // Wait for socket if needed
        if (socket?.readyState === WebSocket.OPEN) {
          handleSend(genieState.prompt);
          // Clear prompt in store so it doesn't re-trigger
          useAppStore.setState(s => ({ ...s, genieState: { ...s.genieState, prompt: null } }));
        }
      }
    } else {
      setIsOpen(false);
    }
  }, [genieState.isOpen, genieState.prompt, socket?.readyState]);

  const toggleChat = () => {
    if (isOpen) {
      closeGenie();
    } else {
      setIsOpen(true);
      useAppStore.setState(s => ({ ...s, genieState: { ...s.genieState, isOpen: true } }));
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleChat}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300",
            isOpen ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
          )}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6 animate-pulse" />}
        </motion.button>
        {!isOpen && (
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="absolute -top-12 right-0 bg-card/95 backdrop-blur-md border border-border/50 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap shadow-xl"
           >
             Ask Genie (GPT-4o)
           </motion.div>
        )}
      </div>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[450px] max-w-[calc(100vw-48px)] h-[650px] max-h-[calc(100vh-120px)] bg-card/95 backdrop-blur-2xl border border-border/30 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-border/20 bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg tracking-tight text-primary">EquityLens Genie</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">GPT-4o Streaming</span>
                  </div>
                </div>
              </div>
              {!socket && isOpen && (
                 <Button variant="ghost" size="icon" onClick={() => window.location.reload()} className="text-muted-foreground">
                   <RefreshCw className="w-4 h-4 animate-spin-slow" />
                 </Button>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
              {messages.map((msg, i) => (
                <div key={i} className={cn(
                  "flex gap-4 max-w-[90%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1",
                    msg.role === 'assistant' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed prose prose-invert prose-sm max-w-none",
                      msg.role === 'assistant' 
                        ? "bg-muted/50 border border-border/20 rounded-tl-none" 
                        : "bg-primary text-primary-foreground rounded-tr-none shadow-md"
                    )}>
                      {msg.content || (msg.isStreaming ? "..." : "")}
                    </div>
                    
                    {msg.action && msg.action.type === 'mitigation' && (
                      <div className="pt-2">
                        <Button 
                          onClick={() => handleApplyMitigation(msg.action!.value)}
                          className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20 text-xs gap-2 py-5 rounded-xl group"
                        >
                          <PlayCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          Apply {msg.action.value.replace('_', ' ')} Protocol
                        </Button>
                      </div>
                    )}

                    {msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (
                      <div className="flex flex-wrap gap-2">
                        {msg.suggestions.map((s, j) => (
                          <button
                            key={j}
                            onClick={() => handleSend(s)}
                            className="px-3 py-1.5 rounded-full bg-primary/5 hover:bg-primary/10 border border-primary/20 text-[11px] font-medium transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length-1]?.role !== 'assistant' && (
                <div className="flex gap-4 max-w-[90%]">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/50 border border-border/20 rounded-tl-none flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-border/20 bg-background/50">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(inputValue);
                }}
                className="relative"
              >
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={socket ? "Ask about bias, risks, or compliance..." : "Connecting to AI..."}
                  disabled={!socket || isLoading}
                  className="pr-24 h-12 bg-muted/30 border-border/30 rounded-2xl focus:ring-primary/20"
                />
                <div className="absolute right-1.5 top-1.5 flex gap-1">
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={startSpeechRecognition}
                    disabled={!socket || isLoading}
                    className={cn(
                      "w-9 h-9 rounded-xl transition-all duration-200",
                      isRecording ? "bg-destructive/20 text-destructive animate-pulse" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <Button 
                    type="submit"
                    disabled={!inputValue.trim() || isLoading || !socket}
                    size="icon"
                    className="w-9 h-9 rounded-xl transition-all duration-200"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
              <div className="mt-4 flex items-center justify-center gap-6 text-muted-foreground/40">
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="w-3 h-3" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Insights</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3 h-3" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Risks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileSearch className="w-3 h-3" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Compliance</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
