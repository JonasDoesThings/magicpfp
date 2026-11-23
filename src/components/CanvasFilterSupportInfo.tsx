'use client';

import {useSyncExternalStore} from 'react';
import {TriangleAlert} from 'lucide-react';

const emptySubscribe = () => () => {};

function isCanvasFilterSupported(): boolean {
  if (typeof OffscreenCanvas === 'undefined' || typeof OffscreenCanvasRenderingContext2D === 'undefined') {
    return false;
  }

  return 'filter' in OffscreenCanvasRenderingContext2D.prototype;
}

/**
 * Component that waits for client-mounting to prevent hydration issues
 */
export function CanvasFilterSupportInfo() {
  const isSupported = useSyncExternalStore(
    emptySubscribe,
    isCanvasFilterSupported,
    () => true,
  );

  if (isSupported) return null;

  return (
    <div
      role='alert'
      className='flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 my-2 text-xs text-amber-700 dark:text-amber-400'
    >
      <TriangleAlert className='shrink-0 mt-0.5' size={14} />
      <span>
        Your browser does not support canvas filters (e.g. Safari), so these image filters will not work. Try using Chrome or Firefox instead.
      </span>
    </div>
  );
}
