'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { ChatInput } from '@/components/ChatInput';
import { StatusBadge } from '@/components/StatusBadge';
import { StorageWarning } from '@/components/StorageWarning';
import { SettingsModal } from '@/components/SettingsModal';
import { AboutModal } from '@/components/AboutModal';
import { useChats } from '@/hooks/useChats';
import { useChat } from '@/hooks/useChat';
import { useSystemInfo } from '@/hooks/useSystemInfo';
import { useSettings } from '@/hooks/useSettings';
import { fetchModels } from '@/lib/api';
import { ModelItem } from '@/types';
import { Menu, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [models, setModels] = useState<ModelItem[]>([]);

  // Core Hooks
  const { chats, refreshChats, createChat, renameChat, deleteChat } = useChats();
  const { health, systemInfo, loading: healthLoading, refresh: refreshHealth } = useSystemInfo(30000);
  const { settings, saveSettings } = useSettings();

  // Load available models on mount
  useEffect(() => {
    fetchModels()
      .then(setModels)
      .catch((err) => console.warn('Failed to load models list:', err));
  }, []);

  // Initialize with the most recent chat if available and none selected
  useEffect(() => {
    if (!activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  // Active Chat Hook
  const {
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    stopGeneration,
    regenerate,
  } = useChat({
    chatId: activeChatId,
    onTitleUpdated: refreshChats,
  });

  const handleNewChat = async () => {
    try {
      const newChat = await createChat('New Chat', settings.model);
      setActiveChatId(newChat.id);
      setSidebarOpen(false);
    } catch (err) {
      console.error('Failed to create new chat:', err);
    }
  };

  const handleSendMessage = async (text: string) => {
    let currentId = activeChatId;

    // If no active chat, create one on-the-fly
    if (!currentId) {
      try {
        const newChat = await createChat('New Chat', settings.model);
        currentId = newChat.id;
        setActiveChatId(newChat.id);
      } catch (err) {
        console.error('Failed to create chat on send:', err);
        return;
      }
    }

    sendMessage(text, {
      model: settings.model,
      temperature: settings.temperature,
      systemPrompt: settings.system_prompt,
    });
  };

  const handleDeleteChat = async (id: string) => {
    await deleteChat(id);
    if (activeChatId === id) {
      const remaining = chats.filter((c) => c.id !== id);
      setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      {/* Left Sidebar */}
      <Sidebar
        conversations={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          setActiveChatId(id);
          setSidebarOpen(false);
        }}
        onNewChat={handleNewChat}
        onRenameChat={renameChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        health={health}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Conversation Pane */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-slate-900/50 relative">
        {/* Top Header */}
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/80 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">PiLLM</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                {settings.model || 'qwen3:4b'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge health={health} loading={healthLoading} />
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* MicroSD Storage Warning Banner */}
        <StorageWarning storage={health?.storage || null} />

        {/* Chat Messages List */}
        <ChatArea
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          onSendMessage={handleSendMessage}
          onRegenerate={regenerate}
          onEditMessage={handleSendMessage}
          health={health}
          autoScrollEnabled={settings.auto_scroll}
        />

        {/* Bottom Input Field */}
        <ChatInput
          onSend={handleSendMessage}
          onStop={stopGeneration}
          isStreaming={isStreaming}
          disabled={health?.ollama === 'offline' || health?.model_available === false}
          placeholder={`Message PiLLM (${settings.model || 'qwen3:4b'})...`}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={saveSettings}
        systemInfo={systemInfo}
        models={models}
        onRefreshSystemInfo={refreshHealth}
      />

      {/* About Modal */}
      <AboutModal
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
        version={health?.version || '1.0.0'}
      />
    </div>
  );
}
