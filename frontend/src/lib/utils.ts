import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Conversation } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatUptime(seconds?: number | null): string {
  if (!seconds) return 'N/A';
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  previous7Days: Conversation[];
  older: Conversation[];
}

export function groupConversationsByDate(conversations: Conversation[]): GroupedConversations {
  const grouped: GroupedConversations = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: [],
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const sevenDaysAgoStart = todayStart - 7 * 86400000;

  for (const conv of conversations) {
    const updated = new Date(conv.updated_at).getTime();

    if (updated >= todayStart) {
      grouped.today.push(conv);
    } else if (updated >= yesterdayStart) {
      grouped.yesterday.push(conv);
    } else if (updated >= sevenDaysAgoStart) {
      grouped.previous7Days.push(conv);
    } else {
      grouped.older.push(conv);
    }
  }

  return grouped;
}
