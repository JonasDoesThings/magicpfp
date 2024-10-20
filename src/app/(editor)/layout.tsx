'use client';

import '~/styles/globals.css';

import {GeistSans} from 'geist/font/sans';
import {ImagePassingContext} from '~/components/ImagePassingContext';
import {useState} from 'react';

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  const [processedSubjectImage, setProcessedSubjectImage] = useState<Blob|undefined>();
  const [backgroundImage, setBackgroundImage] = useState<string|undefined>();

  return (
    <html lang='en' className={`${GeistSans.variable}`}>
      <ImagePassingContext.Provider value={{processedSubjectImage, setProcessedSubjectImage, backgroundImage, setBackgroundImage}}>
        <body>{children}</body>
      </ImagePassingContext.Provider>
    </html>
  );
}
