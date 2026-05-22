"use client";
import React, { useState, useRef, useEffect } from 'react';
import { GitFork, Star, Lock, X, Fingerprint, ShieldCheck, Upload, FileText, Terminal } from 'lucide-react';
import { GitHubRepo } from '@/components/modals/githubRepos/githubrepoModal';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

export default function Page() {
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);
  
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [caseFile, setCaseFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [auditLoadingState, setAuditLoadingState] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<string | null>(null);

  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/");
    },
  });

  // remove BYOK; nothing to load on mount
  useEffect(() => {}, []);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCaseFile(file);
  };
  const handleExecuteScan = async () => {
    // Reset previous results
    setAuditResult(null);
    setAuditLoadingState('Triggering Secure Pipeline...');

    try {
      let caseFileText = '';
      if (caseFile) {
        caseFileText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string || '');
          reader.onerror = reject;
          reader.readAsText(caseFile);
        });
      }

      const payload = { repoUrl: selectedRepo, caseFileText };

      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger pipeline');

      const jobId = data.jobId;

      // progress states
      setAuditLoadingState('Loading AI Engine from Cache...');
      setTimeout(() => setAuditLoadingState('Executing Static Code Analysis...'), 2000);

      // start polling
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts += 1;
        setAuditLoadingState('Awaiting Final Report...');
        try {
          const sres = await fetch(`/api/audit/status?jobId=${jobId}`);
          const sdata = await sres.json();
          if (sdata.status === 'complete' && sdata.report) {
            clearInterval(interval);
            setAuditResult(sdata.report.verifiedFindings || sdata.report.rawFindings);
            setAuditLoadingState(null);
          }
          // optionally stop after some attempts
          if (attempts > 200) {
            clearInterval(interval);
            setAuditLoadingState(null);
          }
        } catch (err) {
          console.error('Polling failed', err);
        }
      }, 3000);

    } catch (err) {
      console.error('Audit Execution Failed:', err);
      setAuditLoadingState(null);
    }
  };

  return (
    <div className='flex flex-col h-screen bg-white py-10 px-6 md:px-12 lg:px-44 font-orbitron text-black overflow-auto'>
      <div className="flex justify-between items-end mb-4 shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wide">
            Security Console
          </h1>
          {selectedRepo && (
            <span className="text-sm font-mono bg-gray-100 text-gray-600 px-3 py-1 rounded-md border border-gray-200 truncate max-w-xs flex items-center gap-2 mt-2 w-fit">
              <GitFork size={14} /> {selectedRepo.split('/').slice(-2).join('/')}
              <button onClick={() => {setSelectedRepo(null); setCaseFile(null);}} className="ml-2 text-black hover:text-red-600">
                <X size={14} />
              </button>
            </span>
          )}
        </div>

        {/* Removed BYOK UI - pipeline handles secrets server-side */}
      </div>

      <div className='flex flex-col lg:flex-row gap-6 w-full h-full mt-2'>
        {/* Section 1: Agentic Logic Auditor */}
        <aside className="w-full lg:w-1/2 h-full bg-gray-100 rounded-lg p-6 flex flex-col">
          <span className="w-full flex gap-2 h-fit justify-center items-center py-4 border-b border-gray-200 mb-6">
            <Fingerprint size={28} />
            <h2 className="font-sans text-xl font-bold">Agentic Logic Auditor / <span className="text-white bg-black p-1.5 text-sm font-medium rounded">Deep Scan</span></h2>
          </span>

          <div className="w-full h-full flex flex-col gap-4 justify-center items-center font-sans">
            {!selectedRepo ? (
              <button 
                className="bg-black text-white py-3 px-6 rounded-lg hover:bg-gray-800 flex flex-row items-center gap-2 cursor-pointer transition-colors duration-200 font-bold tracking-wide" 
                onClick={handleOpenGithubModal}
              >
                <GitFork size={18} /> Select Target Repository
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full px-8">
                <p className="text-sm text-gray-500 text-center">Deploys agents to trace remote data flows and evaluate architecture tradeoffs.</p>
                <button 
                  onClick={handleExecuteScan}
                  disabled={!!auditLoadingState}
                  className="bg-black text-green-400 py-3 px-6 rounded-lg w-full hover:bg-gray-900 transition-colors font-mono font-bold flex justify-center items-center gap-2 border border-gray-800 shadow-lg shadow-black/10 disabled:opacity-50"
                >
                  <Terminal size={16} /> {auditLoadingState ? auditLoadingState : "EXECUTE_AGENTIC_SCAN"}
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="hidden lg:block w-px bg-gray-200 self-stretch shrink-0"></div>
        <hr className="block lg:hidden border-gray-200 w-full shrink-0" />

        {/* Section 2: Static Intelligence Hub */}
        <aside className="w-full lg:w-1/2 h-full bg-gray-100 rounded-lg p-6 flex flex-col">
          <span className="w-full flex gap-2 h-fit justify-center items-center py-4 border-b border-gray-200 mb-6">
            <ShieldCheck size={28} />
            <h2 className="font-sans text-xl font-bold">Static Intelligence Hub / <span className="text-white bg-black p-1.5 text-sm font-medium rounded">Quick Scan</span></h2>
          </span>

          <div className="w-full h-full flex flex-col gap-4 justify-center items-center font-sans">
            {!selectedRepo ? (
              <p className="text-gray-400 text-sm italic text-center px-8">
                Awaiting target selection. Target a repository to enable static metadata and dependency analysis.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full px-8">
                <p className="text-sm text-gray-500 text-center">Fast pattern-matching for CVEs and hardcoded secrets.</p>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".log,.txt,.json"
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-600 py-2.5 px-4 rounded-lg hover:border-black hover:text-black transition-colors flex justify-center items-center gap-2 text-sm font-bold"
                >
                  {caseFile ? (
                    <><FileText size={16} className="text-blue-600" /> {caseFile.name}</>
                  ) : (
                    <><Upload size={16} /> Attach Case File (Optional Breakpoint)</>
                  )}
                </button>

                <button 
                  onClick={handleExecuteScan}
                  className="bg-white border-2 border-black text-black py-3 px-6 rounded-lg w-full hover:bg-gray-100 transition-colors font-mono font-bold flex justify-center items-center gap-2"
                >
                  <Terminal size={16} /> EXECUTE_STATIC_SCAN
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {auditResult && (
        <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="text-green-600" /> Verified Audit Report</h2>
            <button 
              onClick={() => window.print()}
              className="bg-black text-white px-4 py-2 rounded font-sans text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors"
            >
              Download Verified Report (PDF)
            </button>
          </div>
          <div className="bg-white p-6 rounded border border-gray-200 whitespace-pre-wrap font-sans text-sm h-96 overflow-y-auto">
            {auditResult}
          </div>
        </div>
      )}

      <GithubModal 
        isOpen={isGithubModalOpen} 
        onClose={() => setIsGithubModalOpen(false)}
        onSelectRepo={(url) => setSelectedRepo(url)}
        repos={repos}
        isLoading={isFetchingRepos}
      />
      
    </div>
  );
}

// --- Modals below ---

// ApiKeyModal removed - pipeline uses server-side secrets

// ... (GithubModal implementation remains the same as previously provided) ...
interface GithubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRepo: (url: string) => void; 
  repos: GitHubRepo[]; 
  isLoading: boolean;
}

function GithubModal({ isOpen, onClose, onSelectRepo, repos, isLoading }: GithubModalProps) {
  if (!isOpen) return null;
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-gray-200 p-6 rounded-xl w-full max-w-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 font-sans text-black">
        
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold font-orbitron tracking-wide text-black">
            Select Repository
          </h2>
          <button 
            onClick={onClose} 
            className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-md transition-all"
          >
            <X size={20} />
          </button>
        </div>
        <input 
          type="text" 
          placeholder="Search repositories..." 
          className="w-full mb-4 px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-black transition-colors font-mono text-sm" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        
        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2 scrollbtn">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
                <GitFork size={32} className="mb-3 opacity-50" />
                <span className="text-sm tracking-widest uppercase font-bold">Fetching Context...</span>
             </div>
          ) : filteredRepos.length === 0 ? (
             <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg font-mono">
                No repositories found matching your search.
             </div>
          ) : (
            filteredRepos.map((repo) => {
              const targetUrl = `https://github.com/${repo.owner.login}/${repo.name}`;

              return (
                <button
                  key={repo.id}
                  onClick={() => {
                    onSelectRepo(targetUrl);
                    onClose();
                  }}
                  className="w-full flex flex-col text-left p-4 bg-white border border-gray-200 hover:border-black hover:shadow-md transition-all rounded-lg group"
                >
                  <div className="flex justify-between items-start mb-1.5 w-full">
                    <span className="text-black font-bold text-sm flex items-center gap-2">
                      {repo.private && <Lock size={14} className="text-gray-400" />}
                      {repo.name}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                       <span className="flex items-center gap-1">
                         <Star size={14} className="text-gray-400 group-hover:text-yellow-500 transition-colors"/> 
                         {repo.stargazers_count}
                       </span>
                       <span className="flex items-center gap-1">
                         <GitFork size={14} className="text-gray-400 group-hover:text-black transition-colors"/> 
                         {repo.forks_count}
                       </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 font-mono truncate w-full group-hover:text-black transition-colors">
                    {targetUrl}
                  </span>
                </button>
              );
            })
          )}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-black text-sm uppercase tracking-widest transition-colors font-bold"
            >
              Cancel
            </button>
        </div>
      </div>
    </div>
  );
}