import {
  Conversation,
  ConversationDetail,
  HealthInfo,
  Message,
  ModelItem,
  StorageInfo,
  SystemInfo,
  AppSettings,
} from '@/types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchChats(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/chats`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch chats: ${res.statusText}`);
  return res.json();
}

export async function createChat(
  title?: string,
  model?: string,
  system_prompt?: string
): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/chats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, model, system_prompt }),
  });
  if (!res.ok) throw new Error(`Failed to create chat: ${res.statusText}`);
  return res.json();
}

export async function getChat(chatId: string): Promise<ConversationDetail> {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch chat details: ${res.statusText}`);
  return res.json();
}

export async function updateChat(
  chatId: string,
  payload: { title?: string; system_prompt?: string }
): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update chat: ${res.statusText}`);
  return res.json();
}

export async function deleteChat(chatId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete chat: ${res.statusText}`);
}

export async function fetchChatMessages(chatId: string): Promise<Message[]> {
  const res = await fetch(`${API_BASE}/chats/${chatId}/messages`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.statusText}`);
  return res.json();
}

export async function stopChatGeneration(conversationId: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/chat/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation_id: conversationId }),
  });
  if (!res.ok) throw new Error(`Failed to stop chat generation: ${res.statusText}`);
  return res.json();
}

export async function fetchModels(): Promise<ModelItem[]> {
  const res = await fetch(`${API_BASE}/models`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`);
  const data = await res.json();
  return data.models || [];
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  const res = await fetch(`${API_BASE}/system/info`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch system info: ${res.statusText}`);
  return res.json();
}

export async function fetchStorageInfo(): Promise<StorageInfo> {
  const res = await fetch(`${API_BASE}/system/storage`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch storage info: ${res.statusText}`);
  return res.json();
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch settings: ${res.statusText}`);
  return res.json();
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`Failed to update settings: ${res.statusText}`);
  return res.json();
}
