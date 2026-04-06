"use client";

import React, { useState } from "react";
import { Users } from "lucide-react";

interface TeamRoomModalProps {
  isOpen: boolean;
  memberIdInput: string;
  onMemberIdChange: (value: string) => void;
  memberRoleInput: string,
  onMemberRoleChange: (value: string) => void;
  onCancel: () => void;

}

export default function TeamRoomModal({
  isOpen,
  memberIdInput,
  onMemberIdChange,
  memberRoleInput,
  onMemberRoleChange,
  onCancel,
 
}: TeamRoomModalProps) {

  if (!isOpen) return null;

  const[user, setUsers] = useState([{id: "", role: ""}])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUsers([...user, {id: memberIdInput, role: memberRoleInput}])
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-95 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500 via-cyan-500 to-blue-500" />

        <h3 className="text-lg font-mono text-zinc-200 mb-1 flex items-center gap-2">
          <Users size={18} className="text-emerald-500" />
          Join Team Room
        </h3>
        <p className="text-xs text-zinc-500 mb-6">
          Add Team member's github username & role to your workspace and collaborate in real-time.
        </p>

        
        <ul className="mb-4">
            {
                user.map((user, index) => (
              <li className="text-xs text-zinc-400 mb-1"> 
                <span className="font-semibold text-emerald-500">{user.id}</span> - <span className="text-cyan-500">{user.role}</span>
              </li>
                ))
}
        </ul>

        <form
          onSubmit={handleSubmit}
        >
          <input
            autoFocus
            className="w-full bg-[#0c0c0c] border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 font-mono text-sm mb-6 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
            placeholder="e.g. core-platform-ops"
            value={memberIdInput}
            onChange={(e) => onMemberIdChange(e.target.value)}
          />
          <input
            autoFocus
            className="w-full bg-[#0c0c0c] border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 font-mono text-sm mb-6 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
            placeholder="e.g. core-platform-ops"
            value={memberRoleInput}
            onChange={(e) => onMemberRoleChange(e.target.value)}
          />
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-xs font-mono text-zinc-400 hover:bg-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!memberIdInput.trim()}
              className="px-4 py-2 rounded-lg text-xs font-mono bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              Connect to Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
