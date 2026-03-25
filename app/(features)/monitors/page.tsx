/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import MonitorCard from "@/components/monitorCard";
import React, { useEffect, useState } from "react";
import WebserverMonitorModal from "@/components/modals/webserver/webserverMonitorModal";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import GlobalLoader from "@/components/GlobalLoader";

function Page() {
  const [website, setWebsite] = useState([] as any[]);
  const [container, setContainer] = useState([] as any[]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/");
    },
  });

  const fetchMonitors = () => {
    setIsLoading(true);
    fetch("/api/database")
      .then((res) => res.json())
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
  return (
    <div className="flex flex-col min-h-screen bg-white py-10 px-6 md:px-12 lg:px-44 font-orbitron text-black overflow-y-hidden">
      {/* Header Section */}
      <h1 className="text-3xl md:text-4xl font-bold mb-4 tracking-wide">
        <span className="font-sans text-transparent bg-clip-text outlined-text ">
          24/7
        </span>{" "}
        Web server Monitoring
      </h1>
      <hr className="border-gray-200" />

      <p className="text-md text-gray-600 mt-4 mb-10">
        Monitor the uptime and performance of your web servers & containers with
        real-time metrics and alerts.
      </p>

      {/* Main Content Area - Stacks on mobile, side-by-side on large screens */}
      <div className="flex flex-col lg:flex-row w-full flex-1 gap-10 lg:gap-16 h-full">
        
        {/* Left Column: Input & Monitors */}
        <aside className="w-full lg:w-1/2 flex flex-col h-full ">
          <button className="self-end mb-6 px-6 py-3 bg-black text-white uppercase text-sm tracking-widest hover:bg-zinc-800 transition-all cursor-pointer"
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
            <div className="flex flex-col gap-6 overflow-y-auto h-full pr-2">
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
        <div className="hidden lg:block w-0.5 bg-gray-300 self-stretch rounded-full"></div>

        {/* Mobile Horizontal Divider (Hidden on desktop) */}
        <hr className="block lg:hidden border-gray-100 w-full" />

        {/* Right Column: Containers */}
        <aside className="w-full lg:w-1/2 flex flex-col h-full">
          <button className="self-end mb-6 px-6 py-3 bg-black text-white uppercase text-sm tracking-widest hover:bg-zinc-800 transition-all">
            + Add Container
          </button>
          
          {container.length === 0 ? (
            /* FIXED: Wrapper div to take remaining space and center content perfectly */
            <div className="flex-1 flex flex-col items-center justify-center min-h-62.5 border-2 border-dashed border-gray-200 rounded-lg p-6">
              <p className="text-gray-400 text-center">
                Monitor Containers in an isolated environment
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {container.map((item, index) => (
                <div key={index}>
                  {/* Render your container item details here */}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
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