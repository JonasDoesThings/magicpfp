'use client';
import {createContext} from 'react';

export const ImagePassingContext = createContext<{
  processedSubjectImage?: Blob; setProcessedSubjectImage: (value?: Blob) => void;
  backgroundImage?: string; setBackgroundImage: (value?: string) => void;
    }>({
      processedSubjectImage: undefined,
      backgroundImage: undefined,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      setProcessedSubjectImage: (value?: Blob) => {},
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      setBackgroundImage: (value?: string) => {},
    });
