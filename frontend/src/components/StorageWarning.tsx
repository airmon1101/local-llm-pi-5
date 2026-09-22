import React from 'react';
import { AlertTriangle, HardDrive } from 'lucide-react';
import { StorageHealth } from '@/types';

interface StorageWarningProps {
  storage: StorageHealth | null;
}

export const StorageWarning: React.FC<StorageWarningProps> = ({ storage }) => {
  if (!storage || !storage.is_low) return null;

  return (
    <div className="bg-amber-950/80 border-b border-amber-600/60 px-4 py-2 text-amber-200 text-xs md:text-sm flex items-center justify-between z-20">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span>
          <strong>Low MicroSD Storage Warning:</strong> Only {storage.free_gb} GB ({100 - storage.used_percent}% free) remaining on the 64GB card. Consider deleting older conversations or running maintenance to avoid write lock.
        </span>
      </div>
    </div>
  );
};
