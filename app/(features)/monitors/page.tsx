/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import MonitorCard from "@/components/monitorCard";
import React, { useEffect, useState } from "react";
import WebserverMonitorModal from "@/components/modals/webserver/webserverMonitorModal";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import GlobalLoader from "@/components/GlobalLoader";
import GithubRepoModal, { GitHubRepo } from "@/components/modals/githubRepos/githubrepoModal";
import { io, Socket } from "socket.io-client";
import { Activity, Clock, Terminal, Zap, GitBranch } from "lucide-react";

type MonitorSocketPayload = {
  id: string;
  url: string;
  status: "up" | "down" | "online" | "offline" | "pending" | "error";
  latency: number;
  reason: string;
  lastChecked: string;
};

export default function Page() {
  // Existing WebServer State
  const [website, setWebsite] = useState([] as any[]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = React.useRef<Socket | null>(null);

  // New Container/Stress Engine State
  const [container, setContainer] = useState([] as any[]);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);
  
  // Pipeline Execution State
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [engineTarget, setEngineTarget] = useState<string | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/");
    },
  });

  // --- WEBSERVER LOGIC ---
  const fetchMonitors = () => {
    setIsLoading(true);
    fetch("/api/database", { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP error! status: ${res.status}, body: ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        const webServersData = Array.isArray(data) ? data : data.webservers || [];
        setWebsite(webServersData);
      })
      .catch((err) => console.error("Error fetching webservers:", err))
      .finally(() => setIsLoading(false));
  };

  React.useEffect(() => {
    if (status === "authenticated") fetchMonitors();
  }, [status]);

  React.useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    const connectSocket = async () => {
      const socketBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
      const shouldUseInternalSocketRoute = !socketBaseUrl;
      const socketPath =
        process.env.NEXT_PUBLIC_SOCKET_PATH ||
        (shouldUseInternalSocketRoute ? "/api/socketio" : "/socket.io");

      if (shouldUseInternalSocketRoute) {
        try {
          await fetch("/api/socket", { method: "GET" });
        } catch (error) {
          console.error("Failed to initialize monitor socket route:", error);
        }
      }

      if (cancelled) return;

      const socket = io(socketBaseUrl || undefined, {
        path: socketPath,
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      socket.on("connect", () => setIsSocketConnected(true));
      socket.on("disconnect", () => setIsSocketConnected(false));
      socket.on("monitor:metric", (payload: MonitorSocketPayload) => {
        setWebsite((prev) =>
          prev.map((monitor: any) => {
            const monitorId = String(monitor.id || monitor._id || "");
            if (monitorId !== payload.id) return monitor;
            return {
              ...monitor,
              status: payload.status,
              latency: payload.latency,
              reason: payload.reason,
              lastChecked: payload.lastChecked,
            };
          }),
        );
      });
    };

    connectSocket().catch(console.error);

    return () => {
      cancelled = true;
      socketRef.current?.off("connect");
      socketRef.current?.off("disconnect");
      socketRef.current?.off("monitor:metric");
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsSocketConnected(false);
    };
  }, [status]);


  // --- CONTAINER / STRESS ENGINE LOGIC ---
  const handleOpenGithubModal = async () => {
    setIsGithubModalOpen(true);
    if (repos.length > 0) return;

    setIsFetchingRepos(true);
    try {
      const res = await fetch('/api/github/repos');
      if (!res.ok) throw new Error("Failed to fetch repositories");
      const data = await res.json();
      setRepos(data.repos || data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingRepos(false);
    }
  };

  const handleRunStressTest = async (githubUrl: string) => {
    setIsEngineRunning(true);
    setEngineTarget(githubUrl);
    setEngineError(null);

    try {
      const res = await fetch('/api/pipelines/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute pipeline');
      }

      // Add the successful test result to the container list UI
      setContainer(prev => [
        { githubUrl, metrics: data.metrics, testedAt: new Date().toISOString() },
        ...prev
      ]);
    } catch (err: any) {
      setEngineError(err.message);
    } finally {
      setIsEngineRunning(false);
      setEngineTarget(null);
    }
  };


  return (
    <div className="flex flex-col h-screen bg-white py-10 px-6 md:px-12 lg:px-44 font-orbitron text-black overflow-hidden">
      {/* Header Section */}
      <h1 className="text-3xl md:text-4xl font-bold mb-4 tracking-wide shrink-0">
        <span className="font-sans text-transparent bg-clip-text outlined-text">
          24/7
        </span>{" "}
        Web server Monitoring
      </h1>
      <hr className="border-gray-200 shrink-0" />

      <p className="text-md text-gray-600 mt-4 mb-10 shrink-0">
        Monitor the uptime and performance of your web servers & containers with
        real-time metrics and alerts.
      </p>

      <p className="text-xs font-mono tracking-wider text-gray-500 mb-6 shrink-0">
        SOCKET_LINK: {isSocketConnected ? "CONNECTED" : "DISCONNECTED"}
      </p>

      <div className="flex flex-col lg:flex-row w-full flex-1 gap-10 lg:gap-16 min-h-0">
        
        {/* LEFT COLUMN: WEB SERVERS */}
        <aside className="w-full lg:w-1/2 flex flex-col h-full min-h-0">
          <button 
            className="shrink-0 self-end mb-6 px-6 py-3 bg-black text-white uppercase text-sm tracking-widest hover:bg-zinc-800 transition-all cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            + Add Monitor
          </button>

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] border-2 border-dashed border-gray-200 rounded-lg p-6">
              <GlobalLoader />
            </div>
          ) : website.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] border-2 border-dashed border-gray-200 rounded-lg p-6">
              <p className="text-gray-400 text-center">
                Add your website to monitor
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 pb-10 scrollbtn">
              {website.map((item, index) => (
                <MonitorCard 
                  key={index}
                  id={item.id || item._id}
                  name={item.name}
                  url={item.url}
                  status={item.status}
                  reason={item.reason}
                  latency={item.latency}
                  lastChecked={item.lastChecked || item.updatedAt}
                  onDelete={(idToRemove) => setWebsite(prev => prev.filter((w: any) => (w.id || w._id) !== idToRemove))}
                  onCheck={(id) => {
                    fetch('/api/monitor/ping', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id }),
                    }).finally(() => fetchMonitors());
                  }}
                />
              ))}
            </div>
          )}
        </aside>

        <div className="hidden lg:block w-0.5 bg-gray-300 self-stretch rounded-full shrink-0"></div>
        <hr className="block lg:hidden border-gray-100 w-full shrink-0" />

        {/* RIGHT COLUMN: CONTAINERS & PIPELINES */}
        <aside className="w-full lg:w-1/2 flex flex-col h-full min-h-0">
          <button 
            className="shrink-0 self-end mb-6 px-6 py-3 bg-black text-white uppercase text-sm tracking-widest hover:bg-zinc-800 transition-all cursor-pointer"
            onClick={handleOpenGithubModal}
            disabled={isEngineRunning}
          >
            + Add Container
          </button>
          
          {engineError && (
             <div className="shrink-0 mb-4 bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 text-sm font-sans">
               <strong>Execution Error:</strong> {engineError}
             </div>
          )}

          {isEngineRunning ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] border-2 border-dashed border-emerald-500/50 bg-emerald-50/50 rounded-lg p-6 animate-in fade-in">
              <Activity className="animate-pulse text-emerald-500 mb-4" size={40} />
              <p className="text-emerald-700 font-bold mb-2 uppercase tracking-wide">Executing Pipeline</p>
              <p className="text-xs text-emerald-600 text-center font-mono max-w-[80%]">
                Cloning & testing in Ephemeral Sandbox:<br/>
                <span className="font-bold">{engineTarget}</span>
              </p>
            </div>
          ) : container.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] border-2 border-dashed border-gray-200 rounded-lg p-6">
              <p className="text-gray-400 text-center">
                Monitor Containers in an isolated environment.<br/>
                <span className="text-sm">Click "+ Add Container" to stress test a repo.</span>
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 pb-10">
              {container.map((item, index) => (
                <ContainerMetricCard key={index} data={item} />
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* MODALS */}
      <GithubRepoModal 
        isOpen={isGithubModalOpen} 
        onClose={() => setIsGithubModalOpen(false)} 
        repos={repos}
        isLoading={isFetchingRepos}
        onSelectRepo={(url) => handleRunStressTest(url)} 
      />
      
      <WebserverMonitorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchMonitors();
        }}
      />
    </div>
  );
}

// Sub-component to render the pipeline results cleanly in the light theme
function ContainerMetricCard({ data }: { data: any }) {
  const { metrics, githubUrl, testedAt } = data;
  const isHealthy = metrics.successRate > 95;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm font-sans relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1.5 h-full ${isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
      
      <div className="pl-3">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <GitBranch size={16} className="text-gray-500 shrink-0" />
            <h3 className="font-bold text-gray-900 truncate font-mono text-sm" title={githubUrl}>
              {githubUrl.replace('https://github.com/', '')}
            </h3>
          </div>
          <span className="text-xs text-gray-400 shrink-0 font-mono">
            {new Date(testedAt).toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Activity size={12}/> Success</div>
            <div className={`font-bold ${isHealthy ? 'text-emerald-600' : 'text-red-600'}`}>{metrics.successRate}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Zap size={12}/> Req/Sec</div>
            <div className="font-bold text-gray-900">{metrics.requestsPerSecond.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Clock size={12}/> Avg ms</div>
            <div className="font-bold text-gray-900">{metrics.latencyAverage}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Terminal size={12}/> p99 ms</div>
            <div className="font-bold text-gray-900">{metrics.latency99th}</div>
          </div>
        </div>
      </div>
    </div>
  );
}