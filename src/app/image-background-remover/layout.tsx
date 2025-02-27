import type {Metadata} from 'next';

export default function Layout({children}: Readonly<{children: React.ReactNode}>) {
  return children;
}

export const metadata: Metadata = {
  title: 'Free AI Background Remover | No Sign-Up, Open Source',
  description: 'Quickly remove the background of your photos using magicpfp.com. Powered by local AI you can use the free background remover without sign-up in your browser.',
  openGraph: {
    images: [{url: '/og-image.png'}],
    description: 'Quickly remove the background of your photos using magicpfp.com. Powered by local AI you can use the free background remover without sign-up in your browser',
  },
  alternates: {
    canonical: './',
  },
};
