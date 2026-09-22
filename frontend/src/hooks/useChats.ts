import { useState, useEffect, useCallback } from 'react';
import { Conversation } from '@/types';
import { fetchChats, createChat, updateChat, deleteChat } from '@/lib/api';

export function useChats() {
  const [chats, setChats] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchChats();
      setChats(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading chats:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleCreateChat = async (title?: string, model?: string): Promise<Conversation> => {
    const newChat = await createChat(title, model);
    setChats((prev) => [newChat, ...prev]);
    return newChat;
  };

  const handleRenameChat = async (chatId: string, newTitle: string) => {
    const updated = await updateChat(chatId, { title: newTitle });
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title: updated.title, updated_at: updated.updated_at } : c))
    );
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
    setChats((prev) => prev.filter((c) => c.id !== chatId));
  };

  return {
    chats,
    loading,
    error,
    refreshChats: loadChats,
    createChat: handleCreateChat,
    renameChat: handleRenameChat,
    deleteChat: handleDeleteChat,
  };
}
