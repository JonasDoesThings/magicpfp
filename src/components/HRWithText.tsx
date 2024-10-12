import {type PropsWithChildren} from 'react';
import {cn} from '~/lib/utils';

export function HRWithText({children, className}: PropsWithChildren<{className: string}>) {
  return (
    <div className={cn('relative flex items-center [&_div]:border-gray-500/75 text-gray-500/75', className)}>
      <div className='flex-grow border-t'></div>
      <span className='flex-shrink mx-3 font-bold'>{children}</span>
      <div className='flex-grow border-t'></div>
    </div>
  );
}
