'use client';
import {createContext} from 'react';

export const ProcessedSubjectImagePassingContext = createContext<{processedSubjectImage?: Blob; setProcessedSubjectImage: (value?: Blob) => void}>({
  processedSubjectImage: undefined,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setProcessedSubjectImage: (value?: Blob) => {},
});
