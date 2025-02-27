import type {Metadata} from 'next';
import {GeistSans} from 'geist/font/sans';
import '~/styles/globals.css';

export const metadata: Metadata = {
  title: 'magicpfp.com AI powered profile photo generator',
  description: 'Generate and Customize your profile picture using magicpfp.com. Use AI to remove the photo background and customize your pfp using our powerful editor.',
  icons: [{rel: 'icon', url: '/favicon.png'}],
  openGraph: {
    images: [{url: '/og-image.png'}],
    description: 'Generate and Customize your profile picture using magicpfp.com. Use AI to remove the photo background and customize your pfp using our powerful editor.',
    locale: 'en_US',
  },
  alternates: {
    canonical: './',
  },
  metadataBase: new URL('https://magicpfp.com'),
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang='en' className={`${GeistSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
