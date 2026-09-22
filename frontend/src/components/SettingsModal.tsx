import React, { useState, useEffect } from 'react';
import { AppSettings, SystemInfo, ModelItem } from '@/types';
import {
  X,
  Sliders,
  Cpu,
  HardDrive,
  Activity,
  Check,
  RotateCcw,
  Shield,
  Server,
  Sun,
  Moon,
} from 'lucide-react';
import { formatUptime } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<any>;
  systemInfo: SystemInfo | null;
  models: ModelItem[];
  onRefreshSystemInfo?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  systemInfo,
  models,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'ui' | 'system'>('ai');
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSaveSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">PiLLM Settings & Diagnostics</h2>
              <p className="text-xs text-slate-400">Manage local AI behavior and monitor hardware</p>
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

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 px-6 gap-4 bg-slate-900/60 text-sm">
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 font-medium transition border-b-2 flex items-center gap-2 ${
              activeTab === 'ai'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            AI Inference
          </button>
          <button
            onClick={() => setActiveTab('ui')}
            className={`py-3 font-medium transition border-b-2 flex items-center gap-2 ${
              activeTab === 'ui'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Interface
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-3 font-medium transition border-b-2 flex items-center gap-2 ${
              activeTab === 'system'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Hardware & OS
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-200">
          {activeTab === 'ai' && (
            <div className="space-y-5">
              {/* Model Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Default Ollama Model
                </label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                >
                  {models.length > 0 ? (
                    models.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} {m.details?.parameter_size ? `(${m.details.parameter_size})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="qwen3:4b">qwen3:4b (Default)</option>
                  )}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Qwen3 4B runs natively on Raspberry Pi 5 ARM Cortex-A76 cores using 4 CPU threads.
                </p>
              </div>

              {/* Temperature Slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Temperature ({formData.temperature})
                  </label>
                  <span className="text-xs text-slate-400 font-mono">
                    {formData.temperature < 0.5 ? 'Precise' : formData.temperature > 0.8 ? 'Creative' : 'Balanced'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.05"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Max Output Length */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Max Output Length ({formData.max_output_tokens} tokens)
                  </label>
                </div>
                <input
                  type="range"
                  min="256"
                  max="4096"
                  step="256"
                  value={formData.max_output_tokens}
                  onChange={(e) => setFormData({ ...formData, max_output_tokens: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Keeping context capped at 2048-4096 tokens protects the 8GB RAM shared memory pool.
                </p>
              </div>

              {/* System Prompt Editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  System Prompt
                </label>
                <textarea
                  rows={4}
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 font-sans resize-y"
                />
              </div>
            </div>
          )}

          {activeTab === 'ui' && (
            <div className="space-y-5">
              {/* Theme Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Appearance Theme
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: 'dark' })}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-medium text-sm transition ${
                      formData.theme === 'dark'
                        ? 'bg-slate-800 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-emerald-400" />
                    Dark Mode (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: 'light' })}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-medium text-sm transition ${
                      formData.theme === 'light'
                        ? 'bg-slate-800 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-400" />
                    Light Mode
                  </button>
                </div>
              </div>

              {/* Auto Scroll */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                <div>
                  <span className="font-semibold text-sm text-slate-100">Auto-Scroll During Stream</span>
                  <p className="text-xs text-slate-400">Automatically follow new tokens as they arrive</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.auto_scroll}
                  onChange={(e) => setFormData({ ...formData, auto_scroll: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Compact Mode */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                <div>
                  <span className="font-semibold text-sm text-slate-100">Compact Layout</span>
                  <p className="text-xs text-slate-400">Denser padding for mobile or smaller displays</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.compact_mode}
                  onChange={(e) => setFormData({ ...formData, compact_mode: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-4">
              {systemInfo ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                      <span className="text-[11px] text-slate-400">Hostname</span>
                      <p className="font-mono font-semibold text-sm text-slate-100 truncate">{systemInfo.hostname}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                      <span className="text-[11px] text-slate-400">Local LAN IP</span>
                      <p className="font-mono font-semibold text-sm text-emerald-400 truncate">{systemInfo.lan_ip}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                      <span className="text-[11px] text-slate-400">Architecture</span>
                      <p className="font-mono font-semibold text-sm text-slate-100 truncate">{systemInfo.architecture}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                      <span className="text-[11px] text-slate-400">CPU Model</span>
                      <p className="font-mono font-semibold text-xs text-slate-100 truncate">{systemInfo.cpu_model}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                      <span className="text-[11px] text-slate-400">CPU Cores</span>
                      <p className="font-mono font-semibold text-sm text-slate-100">{systemInfo.cpu_cores} Cores</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                      <span className="text-[11px] text-slate-400">System Uptime</span>
                      <p className="font-mono font-semibold text-sm text-slate-100">{formatUptime(systemInfo.uptime_seconds)}</p>
                    </div>
                  </div>

                  {/* RAM Status */}
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-200">System Memory (RAM)</span>
                      <span className="font-mono text-slate-400">
                        {systemInfo.ram_available_gb} GB Free of {systemInfo.ram_total_gb} GB ({systemInfo.ram_used_percent}% used)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          systemInfo.ram_used_percent > 85 ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${systemInfo.ram_used_percent}%` }}
                      />
                    </div>
                  </div>

                  {/* MicroSD Storage Bar */}
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                        MicroSD Flash Storage (64 GB)
                      </span>
                      <span className="font-mono text-slate-400">
                        {systemInfo.storage.free_gb} GB Free of {systemInfo.storage.total_gb} GB
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          systemInfo.storage.is_low ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${systemInfo.storage.used_percent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Mount: <code className="font-mono">{systemInfo.storage.mount_point}</code> • Low threshold: {systemInfo.storage.warning_threshold_percent}%
                    </p>
                  </div>

                  {/* LAN Security Banner */}
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>
                      PiLLM is operating in <strong>LAN ONLY</strong> mode. Outbound connections are blocked by UFW firewall and no public reverse tunnels exist.
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">Loading system telemetry...</div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium hover:bg-slate-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-emerald-400 text-xs flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
