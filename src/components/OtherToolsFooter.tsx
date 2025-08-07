import Link from 'next/link';
import {ExternalLink} from 'lucide-react';

export function OtherToolsListFooter() {
  return (
    <section aria-label='more-tools' className='px-4 pb-16'>
      <h2 className='text-lg font-bold'>Other Free PFP Editing Tools:</h2>
      <ul className='list-disc list-inside [&_a]:underline [&_a]:text-accent'>
        <li><Link href='/'>AI-Powered PFP Creator</Link></li>
        <li><Link href='/image-background-remover'>AI Image Background Remover</Link></li>
        <li><Link href='/image-flipper'>Image Flip & Mirror Tool</Link></li>
        <li><Link href='https://giga.tools/image-tools/exif-reader' target='_blank' className='inline-flex flex-row gap-1 items-center'>Image Metadata & Exif Extractor <ExternalLink className='size-3' /></Link></li>
      </ul>
    </section>
  );
}
