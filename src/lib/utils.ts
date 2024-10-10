import {clsx, type ClassValue} from 'clsx';
import {twMerge} from 'tailwind-merge';
import type {ChangeEvent} from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(func: T, waitMs = 100): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}

export function handleFileUpload(callback: (blobString: string) => void) {
  return (evt: ChangeEvent) => {
    const file = (evt.target as HTMLInputElement).files?.[0];
    if (!file) {
      console.debug('file was null');
      return;
    }

    const reader = new FileReader();

    // Set up a callback when the file is loaded
    reader.onload = async (onLoadEvt) => {
      if (!onLoadEvt.target?.result) {
        console.error('onLoadEvt.target(.result) was null');
        return;
      }

      callback(onLoadEvt.target.result as string);
    };

    reader.readAsDataURL(file as Blob);
  };
}
