'use client';
import {useContext, useEffect, useRef, useState} from 'react';
import {type RemoveImgBackgroundWorkerResponse} from '~/lib/ApplicationState';
import {Input} from '~/components/ui/input';
import {Label} from '~/components/ui/label';
import {debounce, handleImagePaste, handleFileUpload, downloadFileOnClick} from '~/lib/utils';
import {defaultGenerationSettings} from '~/lib/imageVariations';
import {ColorPickerDialog} from '~/components/ColorPickerDialog';
import {Button} from '~/components/ui/button';
import Link from 'next/link';
import {editorTemplates} from '~/lib/editorTemplates';
import {ProcessedSubjectImagePassingContext} from '~/components/ProcessedSubjectImagePassingContext';
import {Download, Loader2, TriangleAlert} from 'lucide-react';
import {WebGPUSupportInfo} from '~/components/WebGPUSupportInfo';

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {processedSubjectImage, setProcessedSubjectImage} = useContext(ProcessedSubjectImagePassingContext);
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
  }, [processedSubjectImage, selectedColor]);

  const generateImages = debounce(async () => {
    if(!processedSubjectImage) return;
    console.time('generateImages');
    const processedSubjectImageBitmap = await createImageBitmap(processedSubjectImage);

    const baseGenerationSettings = {
      ...defaultGenerationSettings,
      brandColor: selectedColor,
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
      <div className='flex flex-row flex-wrap justify-center gap-5 bg-accent text-white px-6 md:px-3 py-2.5 w-full md:max-w-5xl rounded-2xl'>
        <Label className='flex flex-row items-center gap-1.5'>
          <span>Picture</span>
          <Input type='file' className='w-48 md:w-64' accept={'image/*'} onChange={uploadFile} ref={fileInputRef} />
        </Label>
        <Label className='flex flex-row items-center gap-1.5'>
          <span className='text-nowrap'>Background Color</span>
          <ColorPickerDialog value={selectedColor} onChange={setSelectedColor} />
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
      <WebGPUSupportInfo />
    </main>
  );
}
