import React from 'react';
import { Activity, Globe, Clock, Trash2, PlayCircle, AlertTriangle } from 'lucide-react';

interface MonitorCardProps {
  id: string;
  name?: string; // e.g. "Primary API"
  url: string;  // e.g. "https://google.com"
  status: 'online' | 'offline' | 'pending' | 'error';
  latency?: number; // in ms
  lastChecked?: string;
  onDelete?: (id: string) => void;
  onCheck?: (id: string) => void;
}

const MonitorCard: React.FC<MonitorCardProps> = ({ 
  id, 
  name, 
  url, 
  status, 
  latency, 
  lastChecked,
  onDelete,
  onCheck
}) => {
  const isOnline = status === 'online';
  const isError = status === 'offline' || status === 'error';
  
  // Updated colors for light mode
  const statusColor = isOnline ? 'text-green-600' : isError ? 'text-red-600' : 'text-gray-500';
  const bgColor = isOnline ? 'bg-green-50' : isError ? 'bg-red-50' : 'bg-gray-100';
  const borderColor = isOnline ? 'border-green-200' : isError ? 'border-red-200' : 'border-gray-200';


  async function deleteTarget(id: string){
    try{

    }
    catch(error){
      console.error("Failed to delete target:", error);
    }
  };

  return (
    <div className={`group relative w-full p-5 bg-white border ${borderColor} shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300 rounded-lg`}>
      
      {/* Top Bar: Status Icon & URL */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`p-2 rounded-md ${bgColor} ${statusColor} shrink-0`}>
            {isError ? <AlertTriangle size={18} /> : <Activity size={18} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-black font-orbitron font-bold tracking-wide text-sm truncate">
              {name || "UNNAMED_TARGET"}
            </h3>
            <div className="flex items-center gap-1.5 text-gray-500 text-[11px] font-mono mt-1 group-hover:text-black transition-colors">
              <Globe size={11} />
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="truncate hover:underline decoration-gray-400 underline-offset-2"
              >
                {url}
              </a>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-2 py-1 rounded text-[10px] font-mono font-bold border ${borderColor} ${bgColor} ${statusColor} uppercase tracking-widest`}>
          {status}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-px bg-gray-100 border border-gray-100 overflow-hidden rounded-md my-4">
        <div className="bg-white p-3 flex flex-col justify-center">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1">Response</span>
          <span className={`text-xl font-bold font-orbitron ${latency && latency > 500 ? 'text-orange-500' : 'text-black'}`}>
            {latency ? `${latency}ms` : '--'}
          </span>
        </div>
        <div className="bg-white p-3 flex flex-col justify-center">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1">Last Ping</span>
          <div className="flex items-center gap-1.5 text-gray-600 font-mono text-[11px]">
            <Clock size={12} />
            <span>{lastChecked || "NEVER"}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
        <button 
          onClick={() => onCheck?.(id)}
          className="flex items-center gap-2 px-4 py-1.5 text-[11px] bg-gray-50 text-gray-700 hover:text-black hover:bg-gray-200 transition-all font-mono uppercase tracking-wide border border-gray-200 rounded-md"
          title="Manual Ping Check"
        >
          <PlayCircle size={14} /> Test
        </button>
        <button 
          onClick={() => onDelete?.(id)}
          className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
          title="Remove Target"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Hover Effect Line - Top */}
      <div className={`absolute top-0 left-0 w-0 h-1 ${isOnline ? 'bg-green-500' : 'bg-red-500'} transition-all duration-500 group-hover:w-full rounded-t-lg`} />
    </div>
  );
}

export default MonitorCard;