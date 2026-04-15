'use client';
 
import {useSyncExternalStore} from 'react';

const emptySubscribe = () => () => {};

/**
 * component that waits for client-mounting to prevent hydration issues
 */
export function WebGPUSupportInfo() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if(!mounted) return null;
  if (typeof window === 'undefined') return null;
  if ('gpu' in navigator) return null;

  return <span className='text-xs text-red-600'>Your Browser does not support WebGPU. Processing will be slower.</span>;
}
