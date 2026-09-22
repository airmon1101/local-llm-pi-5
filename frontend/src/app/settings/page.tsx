'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useSystemInfo } from '@/hooks/useSystemInfo';
import { SettingsModal } from '@/components/SettingsModal';

export default function SettingsPage() {
  const { settings, saveSettings } = useSettings();
  const { systemInfo } = useSystemInfo();

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to PiLLM Chat
        </Link>
      </div>
      <SettingsModal
        isOpen={true}
        onClose={() => {
          if (typeof window !== 'undefined') window.location.href = '/';
        }}
        settings={settings}
        onSaveSettings={saveSettings}
        systemInfo={systemInfo}
        models={[{ name: 'qwen3:4b' }]}
      />
    </div>
  );
}
