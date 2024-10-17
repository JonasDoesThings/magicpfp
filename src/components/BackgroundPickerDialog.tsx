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
import {type PropsWithChildren, useEffect, useState} from 'react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '~/components/ui/tabs';
import {Input} from '~/components/ui/input';
import {cn, handleFileUpload} from '~/lib/utils';
import {Trash} from 'lucide-react';
import dynamic from 'next/dynamic';
import {Label} from '~/components/ui/label';

const TemplateImagePicker = dynamic(() => import('../components/TemplateImagePicker'));

export function BackgroundPickerDialog({preselectedBackgroundColor, preselectedBackgroundImage, onChange, liveUpdateOnChange}: PropsWithChildren<{preselectedBackgroundColor: string; preselectedBackgroundImage?: string; onChange?: (backgroundColor: string, backgroundImage?: string) => void; liveUpdateOnChange?: boolean}>) {
  const [backgroundColor, setBackgroundColor] = useState(preselectedBackgroundColor);
  const [backgroundImage, setBackgroundImage] = useState(preselectedBackgroundImage);
  const [backgroundType, setBackgroundType] = useState<'COLOR'|'IMAGE'>('COLOR');

  useEffect(() => {
    if(!liveUpdateOnChange) return;
    onChange?.(backgroundColor, backgroundImage);
  }, [backgroundColor, backgroundImage, liveUpdateOnChange]);

  return (
    <Dialog>
      <DialogTrigger className='w-full flex flex-row'>
        <div
          className={cn('w-16 h-8 flex-grow border-white border flex items-center justify-center font-semibold font-mono text-xs text-white', (backgroundImage ? 'rounded-l-full' : 'rounded-full'))}
          style={{background: backgroundColor}}
          onClick={() => setBackgroundType('COLOR')}
        ></div>
        {backgroundImage ? (
          <img
            className='h-8 w-16 border-white border rounded-r-full object-cover'
            src={backgroundImage}
            alt='selected background image'
            onClick={() => setBackgroundType('IMAGE')}
          />
        ) : null}
      </DialogTrigger>
      <DialogContent className='px-4 w-[90vw] md:w-auto flex flex-col min-h-96' withoutCloseButton>
        <DialogTitle className='sr-only'>Background Picker</DialogTitle>
        <DialogDescription className='sr-only'>
          Pick a background
        </DialogDescription>
        <Tabs className='flex-grow' value={backgroundType} onValueChange={(tab) => setBackgroundType(tab as typeof backgroundType)}>
          <TabsList className='w-full'>
            <TabsTrigger value='COLOR' className='flex-grow'>
              {backgroundColor ? <div className='w-6 h-6 mr-3' style={{backgroundColor}} /> : null}
              Color
            </TabsTrigger>
            <TabsTrigger value='IMAGE' className='flex-grow'>
              {backgroundImage ? <img src={backgroundImage} className='w-auto h-6 mr-3' alt='selected background image' /> : null}
              Image
            </TabsTrigger>
          </TabsList>
          <TabsContent value='COLOR'>
            <ColorPicker
              value={backgroundColor}
              onChange={setBackgroundColor}
              className='w-full mx-auto'
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
          </TabsContent>
          <TabsContent value='IMAGE' className='space-y-4 pt-2'>
            <div>
              <Label>
                <p className='mb-2 font-bold'>Use your own Image</p>
                <div className='flex flex-row items-center justify-center gap-3 pl-2'>
                  <Input type='file' accept={'image/*'} onChange={handleFileUpload(setBackgroundImage)} />
                  <Button className='flex-shrink' variant='outline' onClick={() => setBackgroundImage(undefined)}>
                    <Trash size={20} strokeWidth={2.5} />
                  </Button>
                </div>
              </Label>
              <p className='text-gray-400 pl-2 mt-1 text-xs'><span className='font-bold'>Selected Images never leave your device</span>, they are processed locally in your browser and are not stored.</p>
            </div>
            <Label className='inline-block'>
              <p className='mb-2 font-bold'>Or chose an Image</p>
              <TemplateImagePicker className='pl-2' onChange={setBackgroundImage} />
            </Label>
          </TabsContent>
        </Tabs>
        <DialogClose asChild><Button className='bg-accent' onClick={() => onChange?.(backgroundColor, backgroundImage)}>Done</Button></DialogClose>
      </DialogContent>
    </Dialog>
  );
}
