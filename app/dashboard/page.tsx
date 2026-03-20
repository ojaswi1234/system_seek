"use client";
import { useSession } from "next-auth/react";
import React, { useEffect, useRef, useState } from "react";
import { redirect } from "next/navigation";
import { Search, Terminal, AlertTriangle, CheckCircle2 } from "lucide-react";
import GlobalLoader from "@/components/GlobalLoader";

// Updated type to include the diagnostic trace
type StatusObject = {
  statusCode: number;
  message: string;
  diagnostic?: string; // Optional curl trace
  details?: string;
};

function Page() {
  const [data, setData] = useState(null);
  const [checking, setChecking] = useState(false);
  const [isstatus, setStatus] = useState<StatusObject | string | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const [githubData, setGithubData] = useState(0);

  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/");
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.trim() === "") {
      setStatus(null);
      setChecking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      checkStatus(e.currentTarget.value);
    }
  };

  const checkStatus = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;

    setChecking(true);
    setStatus(null);

    try {
      const res = await fetch(
        `/api/check_status?url=${encodeURIComponent(targetUrl)}`,
      );
      const result = await res.json();

      // We don't throw an error here because result might contain
      // the diagnostic trace even if res.ok is false
      setStatus(result);
    } catch (e) {
      console.error(e);
      setStatus("CONNECTION_REFUSED_OR_TIMEOUT");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/github/repos")
        .then((res) => res.json())
        .then((data) => setGithubData(data.total_count))
        .catch((err) => {
          console.error("Failed to fetch GitHub repos:", err);
          setGithubData(0);
        });
    }
  }, [status]);

  if (status === "loading") {
    return <GlobalLoader text="VERIFYING_SESSION..." />;
  }

  return (
    <div className="flex-1 min-h-screen bg-white py-10 px-6 md:px-12 lg:px-44 overflow-y-auto">
      <div className="w-full border border-zinc-800 bg-zinc-950 p-6 md:p-10 shadow-2xl transition-all">
        {/* Input Section */}
        <div className="w-full md:w-3/4 flex flex-row items-center border-b border-zinc-800 group focus-within:border-white transition-colors">
          <Search
            className="text-zinc-600 group-focus-within:text-white transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="ENTER_TARGET_URL TO CHECK LIVE STATUS..."
            ref={urlRef}
            onKeyDown={handleKeyDown}
            onChange={handleInputChange}
            className="outline-none w-full h-12 bg-transparent text-zinc-100 px-4 font-mono text-sm uppercase tracking-widest placeholder:text-zinc-700"
          />
        </div>

        {/* Results Section */}
        <div className="mt-8 min-h-25">
          {checking ? (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 animate-ping rounded-full" />
              <p className="text-sm font-mono text-zinc-400 uppercase tracking-tighter">
                &gt; INITIALIZING_STRESS_TEST...
              </p>
            </div>
          ) : isstatus !== null ? (
            typeof isstatus === "object" ? (
              <div className="space-y-6">
                {/* Status Header */}
                <div className="flex items-center gap-4">
                  {isstatus.statusCode >= 200 && isstatus.statusCode < 300 ? (
                    <CheckCircle2 className="text-green-500" size={24} />
                  ) : (
                    <AlertTriangle className="text-red-500" size={24} />
                  )}

                  <div className="font-mono">
                    <span
                      className={`text-2xl font-bold ${isstatus.statusCode < 400 ? "text-green-400" : "text-red-500"}`}
                    >
                      {isstatus.statusCode}
                    </span>
                    <span className="ml-3 text-zinc-500 uppercase tracking-widest text-sm">
                      {isstatus.message}
                    </span>
                  </div>
                </div>

                {/* Diagnostic Trace (The Terminal Block) */}
                {isstatus.diagnostic && (
                  <div className="mt-6 border border-zinc-800 bg-black/50 p-4 relative">
                    <div className="absolute -top-3 left-4 bg-zinc-950 px-2 flex items-center gap-2">
                      <Terminal size={12} className="text-zinc-500" />
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                        Failure_Analysis_Trace
                      </span>
                    </div>

                    <pre className="text-xs font-mono text-red-400/80 leading-relaxed overflow-x-auto py-2">
                      {isstatus.diagnostic.split("|").map((part, i) => (
                        <div key={i} className="py-0.5">
                          &gt; {part.trim()}
                        </div>
                      ))}
                    </pre>

                    {isstatus.details && (
                      <p className="mt-2 text-[10px] font-mono text-zinc-600 border-t border-zinc-900 pt-2 italic">
                        SYSTEM_LOG: {isstatus.details}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 border border-red-900 bg-red-950/10 text-red-500 font-mono text-xs uppercase tracking-widest">
                CRITICAL_ERROR: {isstatus}
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em]">
              <div className="w-1 h-1 bg-zinc-800" />
              WAITING_FOR_SEQUENCE_INITIATION
            </div>
          )}
        </div>
      </div>
      <div className="w-full h-full grid md:grid-cols-2 justify-center items-center mt-10 gap-6">
        <div className="bg-zinc-600/20 justify-center flex flex-col items-center gap-2 font-orbitron p-16">
       
          <span className="text-3xl">{githubData}</span>
          <span className="font-bold">GITHUB Repos</span>
        </div>
        <div className="bg-zinc-600/20 justify-center flex flex-col items-center gap-2 font-orbitron p-16">
          
          <span className="text-3xl">0</span>
          <span className="font-bold">Containers</span>
        </div>
      </div>
    </div>
  );
}

export default Page;
