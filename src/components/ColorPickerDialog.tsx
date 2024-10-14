'use client';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import ColorPicker from 'react-best-gradient-color-picker';
import {Button} from '~/components/ui/button';
import {type PropsWithChildren, useState} from 'react';

export function ColorPickerDialog({value, onChange, liveUpdateOnChange}: PropsWithChildren<{value: string; onChange?: (value: string) => void; liveUpdateOnChange?: boolean}>) {
  const [selectedColor, setSelectedColor] = useState(value);

  return (
    <Dialog>
      <DialogTrigger className='w-full'>
        <div className='w-16 h-8 border-white border rounded-full flex items-center justify-center font-semibold font-mono text-xs text-white' style={{background: selectedColor}}></div>
      </DialogTrigger>
      <DialogContent className='px-4 w-auto' withoutCloseButton>
        <DialogTitle className='sr-only'>Color Picker</DialogTitle>
        <DialogDescription className='sr-only'>
          Pick a color
        </DialogDescription>
        <ColorPicker
          value={selectedColor}
          onChange={(value) => {
            setSelectedColor(value);
            if(liveUpdateOnChange) {
              onChange?.(value);
            }
          }}
          className='w-full'
          hideEyeDrop
          presets={[
            'rgba(0,0,0,1)',
            'rgba(128,128,128, 1)',
            'rgba(192,192,192, 1)',
            'rgba(255,255,255, 1)',
            'rgba(0,0,128,1)',
            'rgba(0,0,255,1)',
            'rgba(0,255,255, 1)',
            'rgba(0,128,0,1)',
            'rgba(101,163,13, 1)',
            'rgba(0,128,128,1)',
            'rgba(0,255,0, 1)',
            'rgba(128,0,0, 1)',
            'rgba(128,0,128, 1)',
            'rgba(175, 51, 242, 1)',
            'rgba(241,51,127, 1)',
            'rgba(255,0,0, 1)',
            'rgba(240, 103, 46, 1)',
            'rgba(255,255,0, 1)',
          ]}
        />
        <DialogClose asChild><Button className='bg-accent' onClick={() => onChange?.(selectedColor)}>Done</Button></DialogClose>
      </DialogContent>
    </Dialog>
  );
}
