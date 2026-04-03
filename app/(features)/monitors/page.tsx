/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import MonitorCard from "@/components/monitorCard";
import React, { useEffect, useRef, useState } from "react";
import WebserverMonitorModal from "@/components/modals/webserver/webserverMonitorModal";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import GlobalLoader from "@/components/GlobalLoader";
import GithubRepoModal from "@/components/modals/githubRepos/githubrepoModal";
import { io, Socket } from "socket.io-client";

function Page() {
  const [website, setWebsite] = useState([] as any[]);
  const [container, setContainer] = useState([] as any[]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/");
    },
  });

  const fetchMonitors = () => {
    setIsLoading(true);
    fetch("/api/database")
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
    if (status === "authenticated") {
      fetchMonitors();
    }
  }, [status]);

  // Establish a Socket.io connection and listen for real-time metric updates
  useEffect(() => {
    let active = true;

    // Hit the socket endpoint once to initialise the server-side Socket.io instance
    const initSocket = async () => {
      try {
        await fetch('/api/socket');
      } catch (err) {
        console.error('Failed to initialise Socket.io server:', err);
      }

      if (!active || socketRef.current) return;

      const socket = io({
        path: '/api/socket',
        addTrailingSlash: false,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket.io connected:', socket.id);
      });

      socket.on(
        'metric_update',
        (data: { id: string; status: string; latency: number; reason: string; lastChecked: string }) => {
          setWebsite((prev) =>
            prev.map((w) => {
              const wId = String(w.id || w._id);
              if (wId === data.id) {
                return { ...w, status: data.status, latency: data.latency, reason: data.reason, lastChecked: data.lastChecked };
              }
              return w;
            }),
          );
        },
      );

      socket.on('disconnect', () => {
        console.log('Socket.io disconnected');
      });
    };

    initSocket();

    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);
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

      {/* Main Content Area - Stacks on mobile, side-by-side on large screens */}
      <div className="flex flex-col lg:flex-row w-full flex-1 gap-10 lg:gap-16 min-h-0">
        <GithubRepoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        {/* Left Column: Input & Monitors */}
        <aside className="w-full lg:w-1/2 flex flex-col h-full min-h-0">
          <button className="shrink-0 self-end mb-6 px-6 py-3 bg-black text-white uppercase text-sm tracking-widest hover:bg-zinc-800 transition-all cursor-pointer"
          onClick={() => setIsModalOpen(true)}>
            + Add Monitor
          </button>

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] border-2 border-dashed border-gray-200 rounded-lg p-6">
              <GlobalLoader />
            </div>
          ) : website.length === 0 ? (
            /* FIXED: Wrapper div to take remaining space and center content perfectly */
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
                      body: JSON.stringify({ id }),
                    }).finally(() => fetchMonitors());
                  }}
                />
              ))}
            </div>
          )}
        </aside>

        {/* Desktop Vertical Divider (Hidden on mobile) */}
        <div className="hidden lg:block w-0.5 bg-gray-300 self-stretch rounded-full shrink-0"></div>

        {/* Mobile Horizontal Divider (Hidden on desktop) */}
        <hr className="block lg:hidden border-gray-100 w-full shrink-0" />

        {/* Right Column: Containers */}
        <aside className="w-full lg:w-1/2 flex flex-col h-full min-h-0">
          <button className="shrink-0 self-end mb-6 px-6 py-3 bg-black text-white uppercase text-sm tracking-widest hover:bg-zinc-800 transition-all"
          onClick={() => setIsGithubModalOpen(true)}>
            + Add Container
          </button>
          
          {container.length === 0 ? (
            /* FIXED: Wrapper div to take remaining space and center content perfectly */
            <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] border-2 border-dashed border-gray-200 rounded-lg p-6">
              <p className="text-gray-400 text-center">
                Monitor Containers in an isolated environment
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 pb-10">
              {container.map((item, index) => (
                <div key={index}>
                  {/* Render your container item details here */}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
      <GithubRepoModal isOpen={isGithubModalOpen} onClose={() => setIsGithubModalOpen(false)} />
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

export default Page;