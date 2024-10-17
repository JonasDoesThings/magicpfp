'use client';
import {useContext, useEffect, useRef, useState} from 'react';
import {type RemoveImgBackgroundWorkerResponse} from '~/lib/ApplicationState';
import {Input} from '~/components/ui/input';
import {Label} from '~/components/ui/label';
import {debounce, handleImagePaste, handleFileUpload, downloadFileOnClick} from '~/lib/utils';
import {defaultGenerationSettings, type PFPGenerationSettings} from '~/lib/imageVariations';
import {Button} from '~/components/ui/button';
import Link from 'next/link';
import {editorTemplates} from '~/lib/editorTemplates';
import {ImagePassingContext} from '~/components/ImagePassingContext';
import {ChevronRight, Download, Loader2, TriangleAlert} from 'lucide-react';
import {WebGPUSupportInfo} from '~/components/WebGPUSupportInfo';
import {BackgroundPickerDialog} from '~/components/BackgroundPickerDialog';

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {processedSubjectImage, setProcessedSubjectImage, backgroundImage: selectedBackgroundImage, setBackgroundImage: setsSelectedBackgroundImage} = useContext(ImagePassingContext);
  // todo, use url state
  const [selectedColor, setSelectedColor] = useState('#F1337F');
  const [errorMessage, setErrorMessage] = useState<string|null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedVariations, setGeneratedVariations] = useState<({templateId: string; imageDataUrl: string}[])|null>(null);

  const uploadFile = handleFileUpload((blobUrl) => {
    worker.current?.postMessage({blobUrl});
    setErrorMessage(null);
  });

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
        // variations get re-generated when processedSubjectImage gets updated,
        // thus we set isProcessing only after that
        break;
      }
      case 'ERROR': {
        setProcessedSubjectImage(undefined);
        setErrorMessage(evt.data.errorMessage);
        setIsProcessing(false);
        break;
      }
      case 'PROCESSING': {
        setIsProcessing(true);
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

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      worker.current?.removeEventListener('message', onMessageReceived);
      worker.current?.removeEventListener('error', onErrorReceived);
    };
  }, []);

  useEffect(() => {
    const onPaste = handleImagePaste((dataTransfer) => {
      if(!fileInputRef.current) return;
      if(fileInputRef.current.files?.[0]?.name === dataTransfer.files[0]?.name
        && fileInputRef.current.files?.[0]?.size === dataTransfer.files[0]?.size) {
        return;
      }

      fileInputRef.current.files = dataTransfer.files;
      fileInputRef.current.dispatchEvent(new Event('change', {bubbles: true}));
    });

    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('paste', onPaste);
    };
  }, [fileInputRef]);

  useEffect(() => {
    if(!processedSubjectImage) return;
    generateImages();
  }, [processedSubjectImage, selectedColor, selectedBackgroundImage]);

  const generateImages = debounce(async () => {
    if(!processedSubjectImage) return;
    console.time('generateImages');
    const processedSubjectImageBitmap = await createImageBitmap(processedSubjectImage);

    const baseGenerationSettings: PFPGenerationSettings = {
      ...defaultGenerationSettings,
      brandColor: selectedColor,
      backgroundImage: selectedBackgroundImage,
    };

    // maybe split-up and process in batches when we add more templates in the future?
    setGeneratedVariations((await Promise.all(Object.entries(editorTemplates).map(async ([templateId, template]) => ({
      templateId: templateId,
      imageDataUrl: await template.generate(processedSubjectImageBitmap, {
        ...baseGenerationSettings,
        ...(typeof template.templateGenerationSettingsOverwrites === 'function'
          ? template.templateGenerationSettingsOverwrites(baseGenerationSettings)
          : template.templateGenerationSettingsOverwrites),
      }),
    })))));

    setIsProcessing(false);
    console.timeEnd('generateImages');
  });

  return (
    <main className='min-h-screen flex flex-col py-8 px-6 md:px-12 items-center justify-center gap-8'>
      <div className='flex flex-row flex-wrap justify-center gap-5 bg-accent text-accent-foreground px-6 md:px-3 py-2.5 w-full md:max-w-5xl rounded-2xl'>
        <Label className='flex flex-row items-center gap-1.5'>
          <span>Picture</span>
          <Input type='file' className='w-48 md:w-64' accept={'image/*'} onChange={uploadFile} ref={fileInputRef} />
        </Label>
        <Label className='flex flex-row items-center gap-1.5'>
          <span className='text-nowrap'>Background</span>
          <BackgroundPickerDialog preselectedBackgroundColor={selectedColor} preselectedBackgroundImage={selectedBackgroundImage} onChange={(backgroundColor, backgroundImage) => {
            setSelectedColor(backgroundColor);
            setsSelectedBackgroundImage(backgroundImage);
          }} />
        </Label>
      </div>
      <div className='flex-grow'>
        {errorMessage ? (
          <div className='mx-auto px-8 text-red-700 text-center'>
            <TriangleAlert className='mx-auto' size={48} />
            <p className='font-bold text-lg'>{errorMessage}</p>
          </div>
        ) : null}
        {isProcessing ? (
          <div className='text-center animate-pulse'>
            <Loader2 className='animate-spin stroke-accent mx-auto' size={48} />
            <span className='text-accent font-bold text-lg'>Processing</span>
          </div>
        ) : (generatedVariations != null && generatedVariations.length > 0) ? (
          <div className='flex flex-row items-center justify-center flex-wrap gap-8 gap-y-12 md:gap-8'>
            {generatedVariations.map((generatedImage) => (
              <div className='w-40 h-40 md:w-48 md:h-48 aspect-square relative group font-bold' key={generatedImage.templateId}>
                <img className='w-full h-full' src={generatedImage.imageDataUrl} />
                <div className='flex flex-row justify-center gap-1.5 mt-1 md:absolute md:left-0 md:right-0 md:bottom-2 md:opacity-0 group-hover:opacity-100 transition duration-200'>
                  <Link
                    href={`/editor?template=${generatedImage.templateId}&brandColor=${encodeURIComponent(selectedColor)}`}
                    className='block'
                  >
                    <Button size='sm'>
                      Customize
                    </Button>
                  </Link>
                  <Button size='sm' onClick={downloadFileOnClick(generatedImage.imageDataUrl)}><Download size={20} /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <p className='mt-8 md:mt-1 text-xs'>
        Powered by <a className='underline' href='https://huggingface.co/briaai/RMBG-1.4/' target='_blank' rel='nofollow'>RMBG-1.4</a><br />
        Made my <a className='underline' href='https://twitter.com/JonasDoesThings' target='_blank'>JonasDoesThings</a>, source code on <a className='underline' href='https://github.com/JonasDoesThings/magicpfp' target='_blank'>GitHub</a>
      </p>
      <WebGPUSupportInfo />
    </main>
  );
}
