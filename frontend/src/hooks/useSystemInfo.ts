import { useState, useEffect, useCallback } from 'react';
import { HealthInfo, SystemInfo } from '@/types';
import { fetchHealth, fetchSystemInfo } from '@/lib/api';

export function useSystemInfo(pollIntervalMs = 30000) {
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [hData, sData] = await Promise.allSettled([
        fetchHealth(),
        fetchSystemInfo(),
      ]);

      if (hData.status === 'fulfilled') setHealth(hData.value);
      if (sData.status === 'fulfilled') setSystemInfo(sData.value);
    } catch (err) {
      console.warn('System status fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Conservative polling to protect Raspberry Pi 5 CPU cycles
    const timer = setInterval(loadData, pollIntervalMs);
    return () => clearInterval(timer);
  }, [loadData, pollIntervalMs]);

  return {
    health,
    systemInfo,
    loading,
    refresh: loadData,
  };
}
