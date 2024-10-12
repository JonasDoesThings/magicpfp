'use client';

import {useEffect, useState} from 'react';

/**
 * component that waits for client-mounting to prevent hydration issues
 */
export function WebGPUSupportInfo() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if(!mounted) return null;
  if (typeof window === 'undefined') return null;
  if ('gpu' in navigator) return null;

  return <span className='text-xs'>Your Browser does not support WebGPU. Processing will be slower.</span>;
}
