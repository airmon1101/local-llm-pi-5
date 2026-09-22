import React, { useState, useMemo } from 'react';
import { Conversation, HealthInfo } from '@/types';
import { groupConversationsByDate } from '@/lib/utils';
import {
  Plus,
  Search,
  MessageSquare,
  Settings,
  Trash2,
  Edit2,
  Check,
  X,
  Cpu,
  Info,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteChat: (id: string) => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  health: HealthInfo | null;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  onOpenSettings,
  onOpenAbout,
  health,
  isOpen,
  onToggle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  // Group by date
  const grouped = useMemo(
    () => groupConversationsByDate(filteredConversations),
    [filteredConversations]
  );

  const startRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const requestDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteChat(id);
    setConfirmDeleteId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const renderGroup = (title: string, list: Conversation[]) => {
    if (list.length === 0) return null;

    return (
      <div className="space-y-1 my-3">
        <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </h3>
        <div className="space-y-0.5">
          {list.map((c) => {
            const isActive = c.id === activeChatId;
            const isEditing = c.id === editingId;
            const isDeleting = c.id === confirmDeleteId;

            return (
              <div
                key={c.id}
                onClick={() => onSelectChat(c.id)}
                className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-sm cursor-pointer transition ${
                  isActive
                    ? 'bg-slate-800 text-white font-medium shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-slate-900 px-2 py-0.5 rounded text-xs text-white border border-emerald-500 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate text-xs md:text-sm">{c.title}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isEditing ? (
                    <>
                      <button
                        onClick={(e) => saveRename(c.id, e)}
                        className="p-1 hover:text-emerald-400"
                        aria-label="Confirm rename"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={cancelRename}
                        className="p-1 hover:text-slate-400"
                        aria-label="Cancel rename"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : isDeleting ? (
                    <div className="flex items-center gap-1 bg-rose-950/90 px-1.5 py-0.5 rounded border border-rose-800">
                      <span className="text-[10px] text-rose-300">Delete?</span>
                      <button
                        onClick={(e) => confirmDelete(c.id, e)}
                        className="p-0.5 text-rose-400 hover:text-rose-200"
                        aria-label="Confirm deletion"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={cancelDelete}
                        className="p-0.5 text-slate-400 hover:text-slate-200"
                        aria-label="Cancel deletion"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => startRename(c, e)}
                        className="p-1 text-slate-400 hover:text-slate-200"
                        aria-label="Rename conversation"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => requestDelete(c.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-72 flex flex-col bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-950">
              π
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white">PiLLM</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-400 border border-emerald-700/50 font-mono">
                  RPi 5
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">Your AI. Your Pi. Your Data.</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm transition shadow-md shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Conversations Input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Conversation List (Date Grouped) */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          {renderGroup('Today', grouped.today)}
          {renderGroup('Yesterday', grouped.yesterday)}
          {renderGroup('Previous 7 Days', grouped.previous7Days)}
          {renderGroup('Older', grouped.older)}

          {filteredConversations.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-500">
              {searchQuery ? 'No matching conversations' : 'No chats yet. Start a new one!'}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80 space-y-1">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings & Telemetry</span>
          </button>
          <button
            onClick={onOpenAbout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <Info className="w-4 h-4 text-slate-400" />
            <span>About PiLLM</span>
          </button>

          {/* MicroSD & LAN security indicator */}
          <div className="mt-2 pt-2 border-t border-slate-800/80 px-2 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Home LAN Only
            </span>
            <span className="font-mono text-[10px]">64GB SD</span>
          </div>
        </div>
      </aside>
    </>
  );
};
