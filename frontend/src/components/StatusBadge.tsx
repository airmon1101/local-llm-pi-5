import React, { useState } from 'react';
import { HealthInfo } from '@/types';
import { ShieldCheck, Server, Database, Cpu, HardDrive, Wifi, ChevronDown } from 'lucide-react';

interface StatusBadgeProps {
  health: HealthInfo | null;
  loading?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ health, loading }) => {
  const [open, setOpen] = useState(false);

  const isHealthy = health?.status === 'healthy';
  const isDegraded = health?.status === 'degraded';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 transition shadow-sm text-slate-200"
        aria-label="Toggle system status details"
      >
        <span
          className={`w-2 h-2 rounded-full animate-pulse ${
            loading
              ? 'bg-amber-400'
              : isHealthy
              ? 'bg-emerald-400'
              : isDegraded
              ? 'bg-amber-400'
              : 'bg-rose-500'
          }`}
        />
        <span className="hidden sm:inline font-mono">
          {loading ? 'Checking...' : isHealthy ? 'All Systems Online' : isDegraded ? 'Service Degraded' : 'Offline'}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold tracking-wide">
          LAN ONLY
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl p-4 z-40 text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                PiLLM Appliance Status
              </span>
              <span className="text-[10px] text-slate-400 font-mono">v{health?.version || '1.0.0'}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-slate-400" />
                  FastAPI Backend
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-slate-400" />
                  Ollama Daemon
                </span>
                <span
                  className={`flex items-center gap-1 font-medium ${
                    health?.ollama === 'online' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      health?.ollama === 'online' ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  {health?.ollama === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-slate-400" />
                  Model ({health?.model_name || 'qwen3:4b'})
                </span>
                <span
                  className={`flex items-center gap-1 font-medium ${
                    health?.model_available ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      health?.model_available ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  {health?.model_available ? 'Available' : 'Missing'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  SQLite (WAL Mode)
                </span>
                <span
                  className={`flex items-center gap-1 font-medium ${
                    health?.database === 'online' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      health?.database === 'online' ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  {health?.database === 'online' ? 'Connected' : 'Error'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  MicroSD Storage
                </span>
                <span
                  className={`flex items-center gap-1 font-medium ${
                    health?.storage.is_low ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      health?.storage.is_low ? 'bg-rose-400' : 'bg-emerald-400'
                    }`}
                  />
                  {health?.storage ? `${health.storage.free_gb} GB Free` : 'Healthy'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <Wifi className="w-3.5 h-3.5 text-slate-400" />
                  Network Exposure
                </span>
                <span className="text-emerald-400 font-medium">LAN Only</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 text-center">
              No Public Internet Exposure • Local CPU Inference
            </div>
          </div>
        </>
      )}
    </div>
  );
};
