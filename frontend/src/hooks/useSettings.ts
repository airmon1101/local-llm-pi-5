import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '@/types';
import { fetchSettings, updateSettings } from '@/lib/api';

const DEFAULT_SETTINGS: AppSettings = {
  model: 'qwen3:4b',
  temperature: 0.7,
  max_output_tokens: 2048,
  system_prompt:
    'You are PiLLM, a helpful AI assistant running locally on a Raspberry Pi. Provide accurate, practical, and easy-to-understand answers. When answering technical questions, provide useful examples.',
  theme: 'dark',
  auto_scroll: true,
  compact_mode: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchSettings();
      setSettings(data);
      // Apply theme to document
      if (typeof window !== 'undefined') {
        if (data.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (data.theme === 'light') {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (err) {
      console.warn('Failed to load settings, using defaults:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = await updateSettings(newSettings);
      setSettings(updated);
      if (updated.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (updated.theme === 'light') {
        document.documentElement.classList.remove('dark');
      }
      return updated;
    } catch (err) {
      console.error('Failed to save settings:', err);
      throw err;
    }
  };

  return {
    settings,
    loading,
    saveSettings,
    refreshSettings: loadSettings,
  };
}
