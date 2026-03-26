"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Terminal as TerminalIcon } from "lucide-react";
import GlobalLoader from "@/components/GlobalLoader";
import { io, Socket } from "socket.io-client";

function Page() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() { redirect("/"); },
  });

  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // 1. Setup WebSocket connection to the Handyman Server 
  useEffect(() => {
    // Connect to separate Express server on port 3001
    socketRef.current = io("https://expert-train-6p67vjvvjrpcr6gw-3001.app.github.dev");

    socketRef.current.on("output", (data: string) => {
      // Append raw terminal output to history 
      setHistory((prev) => [...prev, data]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // 2. Auto-scroll to bottom for real-time output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  if (status === "loading") return <GlobalLoader />;

  const sysName = session?.user?.name 
    ? session.user.name.toUpperCase().replace(/\s+/g, '_') 
    : "ROOT_USER";

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Clear local command for 'clear' keyword 
    if (input === 'clear') {
      setHistory([]);
      setInput("");
      return;
    }

    // Emit the command + Enter key (\r) to the Node-pty backend [cite: 56, 76]
    socketRef.current?.emit("input", input + "\r");
    
    // Add the user command to history for visual feedback
    const prompt = `drift@${sysName.toLowerCase()}:~$ ${input}`;
    setHistory((prev) => [...prev, prompt]);
    
    setInput("");
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl h-[80vh] bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col transition-all">
        
        {/* Window Header */}
        <div className="flex items-center justify-between bg-zinc-900 border-b border-zinc-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <TerminalIcon size={14} className="text-zinc-500" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              DRIFTSEEKER_SHELL // {sysName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-mono text-zinc-500 uppercase">SECURE_CONNECT</span>
          </div>
        </div>

        {/* Console Body */}
        <div 
          ref={scrollRef}
          className="flex-1 p-6 overflow-y-auto font-mono text-sm scrollbar-hide bg-black/50"
        >
          {/* Welcome Message */}
          <div className="text-zinc-500 mb-6 space-y-1">
            <p>DriftSeeker Secure Shell v2.1.0 [Encrypted] </p>
            <p>Target: Standard_Node_Cluster_01</p>
            <p>User: {session?.user?.name || "Admin"}</p>
            <p className="pt-2">Type &apos;drift scan&apos; to check for configuration anomalies[cite: 22].</p>
            <p>Type &apos;fix --auto&apos; to trigger remediation via Jenkins[cite: 45].</p>
          </div>

          {/* History Output */}
          <div className="space-y-1 mb-4">
            {history.map((line, i) => (
              <p key={i} className={line.includes('drift@') ? "text-zinc-400" : "text-green-400/90 whitespace-pre-wrap"}>
                {line}
              </p>
            ))}
          </div>
          
          {/* Active Input Line */}
          <form onSubmit={handleCommand} className="flex items-center gap-2 text-zinc-300">
            <span className="text-green-500 whitespace-nowrap">
              drift@{sysName.toLowerCase()}
            </span>
            <span className="text-blue-400">~</span>
            <span className="text-zinc-500">$</span>
            <input 
              autoFocus
              className="bg-transparent border-none outline-none flex-1 text-zinc-300 caret-green-500"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
          </form>
        </div>
      </div>
    </div>
  );
}

export default Page;