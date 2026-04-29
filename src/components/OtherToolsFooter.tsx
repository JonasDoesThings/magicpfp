import Link from 'next/link';

export function OtherToolsListFooter() {
  return (
    <section aria-label='more-tools' className='px-4 pb-16'>
      <h2 className='text-lg font-bold'>Other Free PFP Editing Tools:</h2>
      <ul className='list-disc list-inside [&_a]:underline [&_a]:text-accent'>
        <li><Link href='/'>AI-Powered PFP Creator</Link></li>
        <li><Link href='https://giga.tools/image-tools/background-remover'>AI Image Background Remover</Link></li>
        <li><Link href='https://giga.tools/image-tools/flip-image'>Image Flip & Mirror Tool</Link></li>
        <li><Link href='https://giga.tools/image-tools/exif-reader'>Image Metadata & Exif Extractor</Link></li>
        <li><Link href='https://giga.tools/image-tools/exif-cleaner'>Image Metadata Remover Tool</Link></li>
        <li><Link href='https://giga.tools/image-tools/placeholder-image-generator'>Placeholder Image Generator</Link></li>
      </ul>
    </section>
  );
}
