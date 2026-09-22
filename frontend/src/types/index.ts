export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  system_prompt?: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface StorageHealth {
  total_gb: number;
  used_gb: number;
  free_gb: number;
  used_percent: number;
  is_low: boolean;
}

export interface HealthInfo {
  status: 'healthy' | 'degraded' | 'unhealthy';
  backend: 'online' | 'offline';
  database: 'online' | 'offline';
  ollama: 'online' | 'offline';
  model_available: boolean;
  model_name: string;
  storage: StorageHealth;
  network_mode: string;
  version: string;
  timestamp: string;
}

export interface StorageInfo {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  used_percent: number;
  is_low: boolean;
  warning_threshold_percent: number;
  mount_point: string;
}

export interface SystemInfo {
  hostname: string;
  lan_ip: string;
  os_name: string;
  architecture: string;
  cpu_model: string;
  cpu_cores: number;
  ram_total_gb: number;
  ram_available_gb: number;
  ram_used_percent: number;
  storage: StorageInfo;
  ollama_status: string;
  active_model: string;
  app_version: string;
  uptime_seconds?: number | null;
}

export interface AppSettings {
  model: string;
  temperature: number;
  max_output_tokens: number;
  system_prompt: string;
  theme: 'dark' | 'light' | 'system';
  auto_scroll: boolean;
  compact_mode: boolean;
}

export interface ModelItem {
  name: string;
  size?: number;
  details?: {
    parameter_size?: string;
    family?: string;
  };
}
