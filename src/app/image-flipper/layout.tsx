import type {Metadata} from 'next';

export default function Layout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <>
      {children}
    </>
  );
}

export const metadata: Metadata = {
  title: 'Free Image Flipper | Free Online Tool No Sign-Up',
  description: 'Quickly flip your photos using magicpfp.com. You can use the free pfp image mirroring tool without sign-up directly in your browser.',
  openGraph: {
    images: [{url: '/og-image.png'}],
    description: 'Quickly flip your photos using magicpfp.com. You can use the free pfp image mirroring tool without sign-up directly in your browser.',
  },
  alternates: {
    canonical: './',
  },
};
