"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Plus, X, Users, User, Image as ImageIcon } from "lucide-react";
import GlobalLoader from "@/components/GlobalLoader";
import TeamRoomModal from "@/components/modals/user/TeamRoomModal";
import WallpaperModal from "@/components/modals/user/WallpaperModal";
import { io, Socket } from "socket.io-client";
import anime from "animejs";
import TerminalDropdown from "@/components/Dropdown";

interface TabData {
  id: string;
  name: string;
}

// A single terminal instance that maintains its own socket and history
function TerminalInstance({
  isActive,
  sysName,
  userName,
  tabId,
  mode,
  roomId,
  themeMode,
  activeWallpaper,
}: {
  isActive: boolean;
  sysName: string;
  userName: string;
  tabId: string;
  mode: "individual" | "team";
  roomId: string | null;
  themeMode: "dark" | "light";
  activeWallpaper: string | null;
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
        process.env.GCP_BACKEND_URL || "https://driftseek.duckdns.org",
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

      if (cleanData.includes("DRIFT_CLEAR_SCREEN")) {
        setTimeout(() => {
          setHistory([]);
        }, 100);
        cleanData = cleanData.replace(/DRIFT_CLEAR_SCREEN\r?\n?/g, "");
      }

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
      {/* Background Wallpaper Image */}
      {activeWallpaper && (
        <div 
          className={`absolute inset-0 z-0 blur-[0px] pointer-events-none ${
            themeMode === "dark" ? "opacity-40" : "opacity-30 mix-blend-multiply"
          }`}
          style={{
            backgroundImage: `url(${activeWallpaper})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      {/* Content wrapper with z-index to overlay on background */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Console Header Stats (Minimalist) */}
        <div
          className={`flex items-center justify-between px-6 py-2 border-b ${
            themeMode === "dark"
              ? "border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md"
              : "border-zinc-200 bg-white/70 backdrop-blur-md"
          }`}
        >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isShellConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-red-500"}`} />
            <span className={`text-xs font-mono ${themeMode === "dark" ? "text-zinc-400" : "text-zinc-800"}`}>{isShellConnected ? "CONNECTED" : "OFFLINE"}</span>
          </div>
          <span className={`text-xs font-mono ${themeMode === "dark" ? "text-zinc-600" : "text-zinc-800 font-medium"}`}>DIR: {currentDir}</span>
        </div>
        {mode === "team" && roomId && (
          <div className="flex items-center gap-2">
            <Users size={12} className="text-emerald-500/70" />
            <span className="text-xs font-mono text-emerald-500/70">ROOM: {roomId}</span>
          </div>
        )}
      </div>

      {/* Terminal View */}
      <div
        ref={scrollRef}
        className={`flex-1 p-6 overflow-y-auto font-mono text-sm custom-scrollbar ${
          themeMode === "dark" ? "text-zinc-300" : "text-zinc-900"
        }`}
      >
        <div className="mb-8 opacity-90 text-xs">
         <div
            style={{ fontFamily: "var(--font-press-start), monospace" }}
            className="text-2xl md:text-6xl bg-clip-text text-transparent 
            bg-linear-to-r from-emerald-400 via-cyan-400 to-blue-500 mb-6 select-none"
          >
            Drift_Seeker
          </div>
          <div className={`space-y-1 font-mono ${themeMode === "dark" ? "text-zinc-400" : "text-zinc-800 font-medium"}`}>
            <p>Welcome to DriftSeeker Terminal [Instance: {tabId}]</p>
            <p>
              Authorized User: {userName}{" "}
              <span className={themeMode === "dark" ? "text-zinc-600" : "text-zinc-700 font-bold"}>({mode.toUpperCase()} MODE)</span>
            </p>
          </div>
          <div className="h-px w-24 bg-linear-to-r from-emerald-500/50 to-transparent my-4" />
        </div>

        <div className="space-y-1.5 mb-4 relative z-10">
          {history.map((line, i) => (
            <p key={i} className={line.startsWith(`${sysName}:`) || line.includes("[client]") ? (themeMode === "dark" ? "text-zinc-500" : "text-zinc-600 font-medium") : (themeMode === "dark" ? "text-green-500 whitespace-pre-wrap" : "text-emerald-700 font-semibold whitespace-pre-wrap")}>
              {line}
            </p>
          ))}
        </div>

        {/* Active Input Line */}
        <form onSubmit={handleCommand} className="flex items-center gap-2 mt-2 relative z-10">
          <span className={themeMode === "dark" ? "text-green-500 shrink-0 select-none" : "text-emerald-700 shrink-0 select-none font-bold"}>❯</span>
          <input
            className={`bg-transparent border-none outline-none flex-1 placeholder-zinc-700 ${themeMode === "dark" ? "text-green-400 caret-green-500" : "text-zinc-950 font-medium caret-emerald-700"}`}
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
  const [mode, setMode] = useState<"individual" | "team">("individual");
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [memberIdInput, setMemberIdInput] = useState("");
  const [memberRoleInput, setMemberRoleInput] = useState("");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [activeWallpaper, setActiveWallpaper] = useState<string | null>(null);

  const fetchActiveWallpaper = async () => {
    try {
      const res = await fetch("/api/wallpaper");
      if (res.ok) {
        const data = await res.json();
        const active = data.wallpapers?.find((w: any) => w.isActive);
        if (active) setActiveWallpaper(active.image);
        else setActiveWallpaper(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchActiveWallpaper();
  }, []);

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
    
    if (activeTabId === idToClose) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleModeSwitch = (newMode: "individual" | "team") => {
    if (newMode === "team") {
      setShowTeamModal(true);
      return;
    }
    setMode("individual");
    setActiveRoomId(null);
  };

  return (
    // THE FIX IS HERE: Added pl-16 sm:pl-20 md:pl-24 lg:pl-24 to safely clear the fixed navbar
    <div
      className={`min-h-screen flex items-center justify-center pl-16 sm:pl-20 md:pl-24 lg:pl-24 pr-4 md:pr-8 py-4 md:py-8 font-sans selection:bg-emerald-500/30 overflow-hidden transition-colors duration-300 ${
        themeMode === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-zinc-100 text-zinc-900"
      }`}
    >
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.2); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.5); }
      `}</style>
      
      {/* THE SECOND FIX IS HERE: w-[98vw] changed to w-full max-w-full to respect parent padding. Height increased to 98vh */}
      <div 
        ref={layoutRef}
        className={`bg-[#0c0c0c] border border-zinc-800/60 rounded-xl shadow-2xl flex flex-col overflow-hidden 
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] origin-center
          w-full max-w-full h-[98vh]
        `}
      >
        {/* Sleek MacOS-like Window Header + Tabs */}
        <div className={`flex border-b ${themeMode === "dark" ? "bg-zinc-950 border-zinc-800/60" : "bg-white border-zinc-200"}`}>
          
          <TerminalDropdown 
            currentMode={themeMode}
            onModeChange={setThemeMode}
          />
          
          <div className="flex flex-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-3 px-4 py-2.5 text-xs font-mono cursor-pointer border-r transition-all duration-200 min-w-35 max-w-50 ${
                  themeMode === "dark" ? "border-zinc-800/60" : "border-zinc-200"
                } ${
                  activeTabId === tab.id
                    ? themeMode === "dark"
                      ? "bg-[#0c0c0c] text-zinc-200"
                      : "bg-zinc-50 text-zinc-900"
                    : themeMode === "dark"
                      ? "bg-zinc-900/50 text-zinc-500 hover:bg-zinc-900"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
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
              className={`flex items-center justify-center px-4 py-2 transition-colors ${
                themeMode === "dark"
                  ? "hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                  : "hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Plus size={14} />
            </button>
          </div>

          <div className={`flex items-center gap-1 px-3 border-l shrink-0 ${themeMode === "dark" ? "border-zinc-800/60" : "border-zinc-200"}`}>
            <div className={`flex rounded-md p-0.5 ${themeMode === "dark" ? "bg-zinc-900" : "bg-zinc-200"}`}>
              <button
                onClick={() => handleModeSwitch("individual")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono transition-all duration-200 ${
                  mode === "individual"
                    ? themeMode === "dark"
                      ? "bg-zinc-800 text-zinc-200 shadow-sm"
                      : "bg-white text-zinc-900 shadow-sm"
                    : themeMode === "dark"
                      ? "text-zinc-500 hover:text-zinc-400"
                      : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <User size={12} />
                <span className="hidden sm:inline">Solo</span>
              </button>
              <button
                onClick={() => handleModeSwitch("team")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono transition-all duration-200 ${
                  mode === "team"
                    ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                    : themeMode === "dark"
                      ? "text-zinc-500 hover:text-zinc-400"
                      : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <Users size={12} />
                <span className="hidden sm:inline">Team</span>
              </button>
            </div>
            
            <button
               onClick={() => setShowWallpaperModal(true)}
               title="Terminal Wallpaper"
               className={`flex items-center gap-1.5 px-3 py-1 ml-2 rounded-sm text-xs font-mono transition-all duration-200 hover:opacity-80
                 ${themeMode === "dark" ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-600 hover:text-zinc-900"}
               `}
            >
               <ImageIcon size={14} />
            </button>
          </div>
        </div>

        {/* Terminals Container */}
        <div className={`flex-1 relative ${themeMode === "dark" ? "bg-[#0c0c0c]" : "bg-zinc-50"}`}>
          {tabs.map((tab) => (
            <TerminalInstance
              key={tab.id}
              tabId={tab.id}
              isActive={activeTabId === tab.id}
              sysName={sysName}
              userName={userName}
              mode={mode}
              roomId={activeRoomId}
              themeMode={themeMode}
              activeWallpaper={activeWallpaper}
            />
          ))}
        </div>
      </div>

      <TeamRoomModal
        isOpen={showTeamModal}
        memberIdInput={memberIdInput}
        onMemberIdChange={setMemberIdInput}
        memberRoleInput={memberRoleInput}
        onMemberRoleChange={setMemberRoleInput}
        onCancel={() => {
          setShowTeamModal(false);
          if (mode !== "team") setMode("individual");
        }}
      />

      <WallpaperModal 
        isOpen={showWallpaperModal}
        onCancel={() => setShowWallpaperModal(false)}
        onWallpaperUpdated={fetchActiveWallpaper}
      />
    </div>
  );
}