"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Terminal as TerminalIcon, Plus, X } from "lucide-react";
import GlobalLoader from "@/components/GlobalLoader";
import { io, Socket } from "socket.io-client";
import anime from "animejs";

interface TabData {
  id: string;
  name: string;
}

// const ASCII_ART =
// `
// ████████▄     ▄████████  ▄█     ▄████████     ███             ▄████████    ▄████████    ▄████████    ▄█   ▄█▄ 
// ███   ▀███   ███    ███ ███    ███    ███ ▀█████████▄        ███    ███   ███    ███   ███    ███   ███ ▄███▀ 
// ███    ███   ███    ███ ███▌   ███    █▀     ▀███▀▀██        ███    █▀    ███    █▀    ███    █▀    ███▐██▀   
// ███    ███  ▄███▄▄▄▄██▀ ███▌  ▄███▄▄▄         ███   ▀        ███         ▄███▄▄▄      ▄███▄▄▄      ▄█████▀    
// ███    ███ ▀▀███▀▀▀▀▀   ███▌ ▀▀███▀▀▀         ███          ▀███████████ ▀▀███▀▀▀     ▀▀███▀▀▀     ▀▀█████▄    
// ███    ███ ▀███████████ ███    ███            ███                   ███   ███    █▄    ███    █▄    ███▐██▄   
// ███   ▄███   ███    ███ ███    ███            ███             ▄█    ███   ███    ███   ███    ███   ███ ▀███▄ 
// ████████▀    ███    ███ █▀     ███           ▄████▀         ▄████████▀    ██████████   ██████████   ███   ▀█▀ 
//              ███    ███                                                                             ▀                                                                                                                                                                                                                                                                                                                                                                               
//  `;

// A single terminal instance that maintains its own socket and history
function TerminalInstance({
  isActive,
  sysName,
  userName,
  tabId,
}: {
  isActive: boolean;
  sysName: string;
  userName: string;
  tabId: string;
}) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isShellConnected, setIsShellConnected] = useState(false);
  const [currentDir, setCurrentDir] = useState<string>("/projects");
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pendingCommandRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize socket
  useEffect(() => {
    try {
      socketRef.current = io(
        process.env.NEXT_PUBLIC_SERVER_BASE_URL || "http://localhost:3001",
        {
          transports: ["polling", "websocket"],
          auth: { username: sysName },
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 2000,
        }
      );
    } catch (err) {
      console.error("Failed to initialize socket:", err);
      setTimeout(() => {
        setHistory((prev) => [...prev, "[client] Failed to initialize shell connection."]);
      }, 0);
      return;
    }

    socketRef.current.on("connect", () => setIsShellConnected(true));
    socketRef.current.on("disconnect", () => setIsShellConnected(false));
    socketRef.current.on("connect_error", (err) => {
      setIsShellConnected(false);
      setHistory((prev) => [...prev, "[client] Unable to connect to terminal server."]);
    });

    socketRef.current.on("output", (data: string) => {
      let cleanData = data
        .replace(/[\u001b\u009b]]\d+;[^\x07]+\x07/g, "")
        .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");

      const promptRegex = /DRIFT_SERVER_PROMPT\|(.*?)\>\s/g;
      let extractedDir: string | null = null;
      let match;
      while ((match = promptRegex.exec(cleanData)) !== null) {
        extractedDir = match[1];
      }
      if (extractedDir) setCurrentDir(extractedDir);

      cleanData = cleanData.replace(promptRegex, "");
      cleanData = cleanData.replace(/[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+:[^\n]+?[#$]\s*/g, "");

      if (pendingCommandRef.current) {
        const cmd = pendingCommandRef.current;
        if (cleanData.trim() === cmd) {
          cleanData = "";
          pendingCommandRef.current = null;
        } else if (cleanData.trim().startsWith(cmd)) {
          const escapedCmd = cmd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          cleanData = cleanData.replace(new RegExp(`^\\s*${escapedCmd}\\s*\\r?\\n?`), "");
          pendingCommandRef.current = null;
        }
      }

      if (cleanData) {
        setHistory((prev) => [...prev, cleanData]);
      }
    });

    return () => {
      socketRef.current?.off("connect");
      socketRef.current?.off("disconnect");
      socketRef.current?.off("connect_error");
      socketRef.current?.off("output");
      socketRef.current?.disconnect();
    };
  }, [sysName]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Anime.js entrance animation when activated
  useEffect(() => {
    if (isActive && containerRef.current) {
      anime({
        targets: containerRef.current,
        opacity: [0, 1],
        translateY: [5, 0],
        duration: 300,
        easing: "easeOutSine",
      });
      setTimeout(() => {
        const inputEl = containerRef.current?.querySelector('input');
        if (inputEl) inputEl.focus();
      }, 50);
    }
  }, [isActive]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (input === "clear") {
      setHistory([]);
      setInput("");
      return;
    }

    if (!socketRef.current?.connected) {
      setHistory((prev) => [...prev, "[client] Shell is disconnected. Reconnect and try again."]);
      return;
    }

    try {
      pendingCommandRef.current = input.trim();
      socketRef.current.emit("input", input + "\r");
    } catch (err) {
      setHistory((prev) => [...prev, "[client] Failed to send command."]);
      return;
    }

    const prompt = `${sysName}:${currentDir}$ ${input}`;
    setHistory((prev) => [...prev, prompt]);
    setInput("");
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 flex flex-col ${isActive ? "z-10" : "hidden"}`}
    >
      {/* Console Header Stats (Minimalist) */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isShellConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-red-500"}`} />
            <span className="text-xs text-zinc-400 font-mono">{isShellConnected ? "CONNECTED" : "OFFLINE"}</span>
          </div>
          <span className="text-xs text-zinc-600 font-mono">DIR: {currentDir}</span>
        </div>
      </div>

      {/* Terminal View */}
      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto font-mono text-sm custom-scrollbar text-zinc-300">
        <div className="mb-8 opacity-90 text-xs">
         <div
  style={{ fontFamily: "var(--font-press-start), monospace" }}
  className="text-2xl md:text-6xl bg-clip-text text-transparent 
  bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 mb-6 select-none"
>
  Drift_Seeker
</div>
          <div className="space-y-1 text-zinc-400 font-mono">
            <p>Welcome to DriftSeeker Terminal [Instance: {tabId}]</p>
            <p>Authorized User: {userName}</p>
          </div>
          <div className="h-px w-24 bg-gradient-to-r from-emerald-500/50 to-transparent my-4" />
        </div>

        <div className="space-y-1.5 mb-4">
          {history.map((line, i) => (
            <p key={i} className={line.startsWith(`${sysName}:`) || line.includes("[client]") ? "text-zinc-500" : "text-emerald-400/90 whitespace-pre-wrap"}>
              {line}
            </p>
          ))}
        </div>

        {/* Active Input Line */}
        <form onSubmit={handleCommand} className="flex items-center gap-2 mt-2">
          <span className="text-emerald-500/70 shrink-0 select-none">❯</span>
          <input
            className="bg-transparent border-none outline-none flex-1 text-zinc-200 caret-emerald-500 placeholder-zinc-700"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder={isShellConnected ? "Enter command..." : "Connecting..."}
            disabled={!isShellConnected}
          />
        </form>
      </div>
    </div>
  );
}

export default function Page() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/");
    },
  });

  const [tabs, setTabs] = useState<TabData[]>([{ id: "tab-1", name: "terminal-1" }]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const tabCounter = useRef(1);

  // Layout Animation
  const layoutRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (layoutRef.current && status !== "loading") {
      anime({
        targets: layoutRef.current,
        opacity: [0, 1],
        scale: [0.98, 1],
        duration: 600,
        easing: "easeOutQuart",
      });
    }
  }, [status]);

  if (status === "loading") return <GlobalLoader />;

  const sysName = session?.user?.username?.toLowerCase().replace(/\s+/g, "_") || "root_user";
  const userName = session?.user?.name || "Admin";

  const addTab = () => {
    tabCounter.current += 1;
    const newTabId = `tab-${tabCounter.current}`;
    setTabs([...tabs, { id: newTabId, name: `terminal-${tabCounter.current}` }]);
    setActiveTabId(newTabId);
  };

  const closeTab = (e: React.MouseEvent, idToClose: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Prevent closing the last tab

    const newTabs = tabs.filter((t) => t.id !== idToClose);
    setTabs(newTabs);
    
    // Switch active tab if we closed the currently active one
    if (activeTabId === idToClose) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 md:p-8 font-sans selection:bg-emerald-500/30">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.2); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.5); }
      `}</style>
      <div 
        ref={layoutRef}
        className="w-full max-w-6xl h-[85vh] bg-[#0c0c0c] border border-zinc-800/60 rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Sleek MacOS-like Window Header + Tabs */}
        <div className="flex bg-zinc-950 border-b border-zinc-800/60">
          <div className="flex px-4 items-center gap-2 border-r border-zinc-800/60 shrink-0">
            <TerminalIcon size={14} className="text-zinc-500" />
          </div>
          
          <div className="flex flex-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-3 px-4 py-2.5 text-xs font-mono cursor-pointer border-r border-zinc-800/60 transition-all duration-200 min-w-[140px] max-w-[200px] ${
                  activeTabId === tab.id
                    ? "bg-[#0c0c0c] text-zinc-200"
                    : "bg-zinc-900/50 text-zinc-500 hover:bg-zinc-900"
                }`}
              >
                <span className="truncate flex-1">{tab.name}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => closeTab(e, tab.id)}
                    className={`ml-auto p-0.5 rounded-md transition-opacity ${
                      activeTabId === tab.id ? "opacity-100 hover:bg-zinc-800" : "opacity-0 group-hover:opacity-100 hover:text-zinc-300"
                    }`}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            
            <button
              onClick={addTab}
              className="flex items-center justify-center px-4 py-2 hover:bg-zinc-900 transition-colors text-zinc-500 hover:text-zinc-300"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Terminals Container */}
        <div className="flex-1 relative bg-[#0c0c0c]">
          {tabs.map((tab) => (
            <TerminalInstance
              key={tab.id}
              tabId={tab.id}
              isActive={activeTabId === tab.id}
              sysName={sysName}
              userName={userName}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
