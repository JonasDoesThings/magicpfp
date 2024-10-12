'use client';
import {type ChangeEvent, useContext, useEffect, useRef, useState} from 'react';
import {type RemoveImgBackgroundWorkerResponse} from '~/lib/ApplicationState';
import {Input} from '~/components/ui/input';
import {Label} from '~/components/ui/label';
import {debounce} from '~/lib/utils';
import {defaultGenerationSettings} from '~/lib/imageVariations';
import {ColorPickerDialog} from '~/components/ColorPickerDialog';
import {Button} from '~/components/ui/button';
import Link from 'next/link';
import {editorTemplates} from '~/lib/editorTemplates';
import {ProcessedSubjectImagePassingContext} from '~/components/ProcessedSubjectImagePassingContext';

export default function HomePage() {
  const {processedSubjectImage, setProcessedSubjectImage} = useContext(ProcessedSubjectImagePassingContext);
  // todo, use url state
  const [selectedColor, setSelectedColor] = useState('#F1337F');
  const [errorMessage, setErrorMessage] = useState<string|null>(null);

  const [generatedVariations, setGeneratedVariations] = useState<({templateId: string; imageDataUrl: string}[])|null>(null);

  const uploadFile = (evt: ChangeEvent) => {
    setProcessedSubjectImage(undefined);
    const file = (evt.target as HTMLInputElement).files?.[0];
    if (!file) {
      console.debug('file was null');
      return;
    }

    const reader = new FileReader();

    // Set up a callback when the file is loaded
    reader.onload = async (onLoadEvt) => {
      if(!onLoadEvt.target?.result) {
        console.error('onLoadEvt.target(.result) was null');
        return;
      }

      worker.current?.postMessage({
        blobUrl: onLoadEvt.target.result as string,
      });
    };

    reader.readAsDataURL(file as Blob);
  };

  const worker = useRef<Worker|null>(null);
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      });
    }

    const onMessageReceived = async (evt: MessageEvent<RemoveImgBackgroundWorkerResponse>) => {
      switch (evt.data.state) {
      case 'DONE': {
        setProcessedSubjectImage(evt.data.processedSubjectImage);
        break;
      }
      case 'ERROR': {
        setProcessedSubjectImage(undefined);
        setErrorMessage(evt.data.errorMessage);
        break;
      }
      default: {
        console.warn('received unknown evt state', evt.data);
        break;
      }
      }
    };

    const onErrorReceived = (evt: ErrorEvent) => {
      setErrorMessage((evt.error as Error).message);
    };

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    worker.current.addEventListener('message', onMessageReceived);
    worker.current.addEventListener('error', onErrorReceived);
    //setAppState({state: 'READY'});

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      worker.current?.removeEventListener('message', onMessageReceived);
      worker.current?.removeEventListener('error', onErrorReceived);
    };
  }, []);

  useEffect(() => {
    if(!processedSubjectImage) return;
    generateImages();
  }, [processedSubjectImage, selectedColor]);

  const generateImages = debounce(async () => {
    if(!processedSubjectImage) return;
    console.time('generateImages');
    const processedSubjectImageBitmap = await createImageBitmap(processedSubjectImage);

    const baseGenerationSettings = {
      ...defaultGenerationSettings,
      brandColor: selectedColor,
    };

    setGeneratedVariations((await Promise.all(Object.entries(editorTemplates).map(async ([templateId, template]) => ({
      templateId: templateId,
      imageDataUrl: await template.generate(processedSubjectImageBitmap, {
        ...baseGenerationSettings,
        ...(typeof template.templateGenerationSettingsOverwrites === 'function'
          ? template.templateGenerationSettingsOverwrites(baseGenerationSettings)
          : template.templateGenerationSettingsOverwrites),
      }),
    })))));
    console.timeEnd('generateImages');
  });

  return (
    <main className='min-h-screen flex flex-col py-8 px-12 items-center justify-center gap-8'>
      <div className='flex flex-row justify-center gap-5 bg-accent text-white px-3 py-2.5 w-full max-w-5xl rounded-2xl'>
        <Label className='flex flex-row items-center gap-1.5'>
          <span>Picture</span>
          <Input type='file' className='w-64' onChange={uploadFile} />
        </Label>
        <Label className='flex flex-row items-center gap-1.5'>
          <span className='text-nowrap'>Background Color</span>
          <ColorPickerDialog value={selectedColor} onChange={setSelectedColor} />
        </Label>
      </div>
      <div className='flex-grow'>
        {errorMessage ? (
          <p className='font-bold text-red-700 text-lg'>{errorMessage}</p>
        ) : null}
        {generatedVariations != null && generatedVariations.length > 0 ? (
          <div className='flex flex-row items-center flex-wrap gap-5'>
            {generatedVariations.map((generatedImage) => (
              <div className='w-48 h-48 aspect-square relative group' key={generatedImage.templateId}>
                <Link href={`/editor?template=${generatedImage.templateId}&brandColor=${encodeURIComponent(selectedColor)}`}>
                  <Button className='opacity-0 group-hover:opacity-100 transition duration-200 mx-6 left-0 right-0 bottom-2.5 absolute font-bold ring ring-white hover:bg-black'>Customize</Button>
                </Link>
                <img className='w-full h-full' src={generatedImage.imageDataUrl} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {('gpu' in navigator) ? null : <span className='text-xs'>Your Browser does not support WebGPU. Processing will be slower.</span>}
    </main>
  );
}
