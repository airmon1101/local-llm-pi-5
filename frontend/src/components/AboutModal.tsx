import React from 'react';
import { X, Shield, Cpu, HardDrive, Wifi, Code2, Heart } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, version }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-950">
              π
            </div>
            <div>
              <h2 className="text-base font-bold text-white">About PiLLM</h2>
              <p className="text-xs text-slate-400">Private Local AI Chat Appliance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs md:text-sm text-slate-300">
          <p className="text-slate-200 leading-relaxed font-medium">
            <strong>PiLLM</strong> is a self-hosted private AI server purpose-built for the{' '}
            <span className="text-emerald-400">Raspberry Pi 5 (8 GB RAM)</span> running Ubuntu Server 24.04 LTS.
          </p>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-start gap-2.5">
              <Cpu className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100">Model Runtime:</strong>
                <p className="text-slate-400 text-xs">Qwen3 4B via Ollama CPU inference utilizing 4 Cortex-A76 cores.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100">Strict LAN Security:</strong>
                <p className="text-slate-400 text-xs">UFW restricts traffic to detected home LAN subnets only. Zero public exposure.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <HardDrive className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100">MicroSD Storage Protection:</strong>
                <p className="text-slate-400 text-xs">SQLite WAL mode, RAM-based temp store, and journald size caps preserve 64GB flash memory.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Code2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100">Clean Layered Architecture:</strong>
                <p className="text-slate-400 text-xs">Nginx Reverse Proxy ➔ Next.js Frontend ➔ FastAPI Backend ➔ SQLite & Ollama.</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-center text-slate-400 text-xs">
            <p>Version {version} • Built for MCA Portfolio & Edge AI Computing</p>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
