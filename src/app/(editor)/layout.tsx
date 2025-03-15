'use client';

import {ImagePassingContext} from '~/components/ImagePassingContext';
import {useState} from 'react';

export default function EditorLayout({children}: Readonly<{children: React.ReactNode}>) {
  const [processedSubjectImage, setProcessedSubjectImage] = useState<Blob|undefined>();
  const [backgroundImage, setBackgroundImage] = useState<string|undefined>();

  return (
    <ImagePassingContext.Provider value={{processedSubjectImage, setProcessedSubjectImage, backgroundImage, setBackgroundImage}}>
      {children}
    </ImagePassingContext.Provider>
  );
}
