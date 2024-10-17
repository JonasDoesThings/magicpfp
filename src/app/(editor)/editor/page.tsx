'use client';
import {Input} from '~/components/ui/input';
import {Label} from '~/components/ui/label';
import {useContext, useEffect, useRef, useState} from 'react';
import {type EditorState, type RemoveImgBackgroundWorkerResponse} from '~/lib/ApplicationState';
import {
  defaultGenerationSettings,
  generateOutputImage,
  type PFPGenerationSettings,
  pfpGenerationSettingsSchema,
} from '~/lib/imageVariations';
import {Button} from '~/components/ui/button';
import {useController, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from '~/components/ui/form';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '~/components/ui/select';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '~/components/ui/accordion';
import {Checkbox} from '~/components/ui/checkbox';
import {
  ChevronLeft, ChevronRight,
  Frame,
  Image,
  Loader2,
  PaintbrushVertical,
  ScanFace,
  TriangleAlert,
} from 'lucide-react';
import {debounce, downloadFileOnClick, handleFileUpload, handleImagePaste} from '~/lib/utils';
import {editorTemplates} from '~/lib/editorTemplates';
import {ImagePassingContext} from '~/components/ImagePassingContext';
import {WebGPUSupportInfo} from '~/components/WebGPUSupportInfo';
import {HRWithText} from '~/components/HRWithText';
import Link from 'next/link';
import {BackgroundPickerDialog} from '~/components/BackgroundPickerDialog';

export default function EditorPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // TODO: sync with url state
  // const [urlFormState, setUrlFormState] = useQueryStates(pfpGenerationSettingsUrlParsingSchema, {history: 'replace'});
  const [editorState, setEditorState] = useState<EditorState>({state: 'INITIALIZING'});
  const editorStateRef = useRef<typeof editorState|undefined>();
  editorStateRef.current = editorState;

  const {processedSubjectImage, setProcessedSubjectImage, backgroundImage: passedBackgroundImage, setBackgroundImage: setPassedBackgroundImage} = useContext(ImagePassingContext);
  const processedSubjectImageRef = useRef<typeof processedSubjectImage|undefined>();
  processedSubjectImageRef.current = processedSubjectImage;

  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState<string|null>(null);

  const worker = useRef<Worker|null>(null);

  const {watch: watchForm, ...generationSettingsForm} = useForm<PFPGenerationSettings>({
    resolver: zodResolver(pfpGenerationSettingsSchema),
    mode: 'all',
    defaultValues: {
      ...defaultGenerationSettings,
      backgroundImage: passedBackgroundImage,
    },
  });

  const {
    field: {value: brandColor, onChange: onBrandColorChange},
  } = useController({
    control: generationSettingsForm.control,
    name: 'brandColor',
  });

  const {
    field: {value: backgroundImage, onChange: onBackgroundImageChange},
  } = useController({
    control: generationSettingsForm.control,
    name: 'backgroundImage',
  });


  const generationSettingsFormRef = useRef<typeof generationSettingsForm|undefined>();
  generationSettingsFormRef.current = generationSettingsForm;
  const isBorderEnabled = watchForm('border');

  let subjectImageBitmap: ImageBitmap | null = null;
  const onFileUpload = handleFileUpload((blobUrl) => {
    worker.current?.postMessage({blobUrl});
  });

  const generateImage = async (generationSettings: PFPGenerationSettings, processedSubjectImageToUse?: Blob) => {
    if(!processedSubjectImageToUse) {
      processedSubjectImageToUse = processedSubjectImage;
    }
    console.log('generatingImage', processedSubjectImageToUse);

    if(!processedSubjectImageToUse) {
      console.warn('no processedSubjectImageToUse');
      return undefined;
    }

    console.time('generating output');
    subjectImageBitmap = await createImageBitmap(processedSubjectImageToUse);
    setGeneratedImageDataUrl(await generateOutputImage(subjectImageBitmap, generationSettings));
    console.timeEnd('generating output');
  };

  useEffect(() => {
    if(typeof window === 'undefined') {
      return;
    }

    const preSelectedColor = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('brandColor')?.trim() : undefined;
    if(preSelectedColor && preSelectedColor.length > 0) {
      generationSettingsForm.setValue('brandColor', preSelectedColor);
    }

    const templateId = new URLSearchParams(window.location.search).get('template')?.trim();
    if(templateId && templateId in editorTemplates) {
      console.debug('loading template ', templateId);

      const baseGenerationSettings = {...defaultGenerationSettings};
      if(preSelectedColor && preSelectedColor.length > 0) {
        baseGenerationSettings.brandColor = preSelectedColor;
      }

      const templateOverwrites =
        typeof editorTemplates[templateId]?.templateGenerationSettingsOverwrites === 'function'
          ? editorTemplates[templateId].templateGenerationSettingsOverwrites(baseGenerationSettings)
          : editorTemplates[templateId]?.templateGenerationSettingsOverwrites ?? {};

      for (const [key, val] of Object.entries(templateOverwrites)) {
        if(key === 'brandColor') {
          generationSettingsForm.setValue(key as keyof PFPGenerationSettings, (val as string));
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        generationSettingsForm.setValue(key as keyof PFPGenerationSettings, val);
      }
    }

    // check if image was passed from frontpage through context
    if(processedSubjectImage) {
      setEditorState({
        state: 'DONE',
        processingSeconds: 0,
      });
      generationSettingsForm.handleSubmit((data) => generateImage(data, processedSubjectImage))()
        .catch((err) => console.error(err));
    }

    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('../worker.ts', import.meta.url), {
        type: 'module',
      });
    }

    const onMessageReceived = async (evt: MessageEvent<RemoveImgBackgroundWorkerResponse>) => {
      switch (evt.data.state) {
      case 'DONE': {
        setProcessedSubjectImage(evt.data.processedSubjectImage);
        setGeneratedImageDataUrl(null);
        setEditorState(evt.data);
        await generationSettingsForm.handleSubmit((data) =>
          generateImage(data, (evt.data as {processedSubjectImage: Blob}).processedSubjectImage))();
        break;
      }
      case 'ERROR': {
        setEditorState(evt.data);
        break;
      }
      case 'PROCESSING' : {
        setEditorState(evt.data);
        break;
      }
      default: {
        console.warn('received unknown evt state', evt.data);
        break;
      }
      }
    };

    const onErrorReceived = (evt: ErrorEvent) => {
      setEditorState({state: 'ERROR', errorMessage: evt.message ?? evt.error?.message ?? 'An unknown error occurred'});
    };

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    worker.current.addEventListener('message', onMessageReceived);
    worker.current.addEventListener('error', onErrorReceived);

    // don't overwrite context-passed processedSubjectImage via state race-condition
    if(editorState.state === 'INITIALIZING' && !processedSubjectImage) {
      setEditorState({state: 'READY'});
    }

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      worker.current?.removeEventListener('message', onMessageReceived);
      worker.current?.removeEventListener('error', onErrorReceived);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const debouncedRegenerateForm = debounce((formData: PFPGenerationSettings) => {
      generationSettingsFormRef.current!.trigger()
        .then(async (isValid) => {
          if (!isValid) return;
          if (editorStateRef.current?.state !== 'DONE') return;
          await generateImage(formData, processedSubjectImageRef.current);
        })
        .catch((err) => console.error(err));
    });

    const {unsubscribe} = watchForm((formData) => {
      debouncedRegenerateForm(formData as PFPGenerationSettings);
    });
    return () => unsubscribe();
  }, [watchForm]);

  if(editorState.state === 'INITIALIZING') {
    return (
      <main className='flex flex-col min-h-screen items-center justify-center'>
        <div className='text-center animate-pulse'>
          <Loader2 className='animate-spin stroke-accent mx-auto' size={48} />
          <span className='text-accent font-bold text-lg'>Setting-Up local AI-Model</span>
        </div>
        <p className='absolute bottom-2 text-xs'>
          Powered by <a className='underline' href='https://huggingface.co/briaai/RMBG-1.4/' target='_blank' rel='nofollow'>RMBG-1.4</a><br />
          Made my <a className='underline' href='https://twitter.com/JonasDoesThings' target='_blank'>JonasDoesThings</a>, source code on <a className='underline' href='https://github.com/JonasDoesThings/magicpfp' target='_blank'>GitHub</a>
        </p>
      </main>
    );
  }

  return (
    <>
      <main className='flex flex-col md:flex-row p-8 gap-8 items-center justify-center'>
        <div className='w-full max-w-md flex flex-col gap-1.5'>
          <div className='flex flex-row justify-between bg-accent text-accent-foreground px-6 md:px-3 py-2.5 rounded-md'>
            <Link href='/' className='flex text-sm flex-row items-center gap-1 hover:text-neutral-100 duration-200 group'>
              <ChevronLeft size={16} strokeWidth={3} className='inline-block group-hover:animate-wiggle duration-200' />
              <span>Back to Frontpage</span>
            </Link>
            <Link href='mailto:jonas@jonasdoesthings.com' className='flex text-sm flex-row items-center gap-1 hover:text-neutral-100 duration-200 group'>
              <span>Report an Issue</span>
              <ChevronRight size={16} strokeWidth={3} className='inline-block group-hover:animate-wiggle duration-200' />
            </Link>
          </div>
          <Form watch={watchForm} {...generationSettingsForm}>
            <form onSubmit={generationSettingsForm.handleSubmit((data) => generateImage(data))} className='space-y-1.5'>
              <div className='border p-6 pt-3 bg-muted rounded-md space-y-4 [&_input]:bg-background'>
                <Label className='space-y-2.5'>
                  <span>Picture</span>
                  <Input type='file' onChange={onFileUpload} ref={fileInputRef} />
                </Label>
                <FormItem>
                  <FormLabel>Background</FormLabel>
                  <FormControl>
                    <BackgroundPickerDialog preselectedBackgroundColor={brandColor} preselectedBackgroundImage={backgroundImage} onChange={(newBackgroundColor, newBackgroundImage) => {
                      setPassedBackgroundImage(newBackgroundImage);
                      onBrandColorChange(newBackgroundColor);
                      onBackgroundImageChange(newBackgroundImage);
                    }} />
                  </FormControl>
                </FormItem>
                <Button type='submit' className='w-full bg-pink-500' disabled={editorState.state === 'PROCESSING'}>Generate</Button>
                <WebGPUSupportInfo />
              </div>
              <hr className='!mt-8 !mb-4 block border' />
              <p className='text-2xl font-bold'>Customizations</p>
              <Accordion type='multiple' className='space-y-2'>
                <AccordionItem value='subject'>
                  <AccordionTrigger><span className='flex flex-row items-center gap-2 font-bold'><ScanFace className='stroke-accent' size={24} /> Subject</span></AccordionTrigger>
                  <AccordionContent>
                    <div className='md:grid md:grid-cols-2 gap-2 w-full'>
                      <FormField
                        control={generationSettingsForm.control}
                        name='subjectScale'
                        render={({field}) => (
                          <FormItem>
                            <FormLabel>
                            Scale (%)
                            </FormLabel>
                            <FormControl>
                              <Input type='number' step={0.1} {...field} />
                            </FormControl>
                            <FormDescription />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={generationSettingsForm.control}
                        name='topMargin'
                        render={({field}) => (
                          <FormItem>
                            <FormLabel>
                            Top Margin
                            </FormLabel>
                            <FormControl>
                              <Input type='number' {...field} />
                            </FormControl>
                            <FormDescription />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <HRWithText className='font-bold my-1'>Image Filters</HRWithText>
                    <div className='md:grid md:grid-cols-2 gap-2 w-full'>
                      <FormField
                        control={generationSettingsForm.control}
                        name='subjectSaturation'
                        render={({field}) => (
                          <FormItem>
                            <FormLabel>
                            Saturation (%)
                            </FormLabel>
                            <FormControl>
                              <Input type='number' {...field} />
                            </FormControl>
                            <FormDescription />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={generationSettingsForm.control}
                        name='subjectContrast'
                        render={({field}) => (
                          <FormItem>
                            <FormLabel>
                            Contrast (%)
                            </FormLabel>
                            <FormControl>
                              <Input type='number' {...field} />
                            </FormControl>
                            <FormDescription />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className='md:grid md:grid-cols-2 gap-2 w-full'>
                      <FormField
                        control={generationSettingsForm.control}
                        name='subjectBrightness'
                        render={({field}) => (
                          <FormItem>
                            <FormLabel>
                            Brightness (%)
                            </FormLabel>
                            <FormControl>
                              <Input type='number' {...field} />
                            </FormControl>
                            <FormDescription />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className='flex flex-col justify-center'>
                        <FormField
                          control={generationSettingsForm.control}
                          name='subjectShadow'
                          render={({field}) => (
                            <FormItem className='mt-1'>
                              <FormLabel className='flex flex-row items-center space-y-0 gap-1.5'>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              Draw Shadow
                              </FormLabel>
                              <FormDescription />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={generationSettingsForm.control}
                          name='subjectSaturation'
                          render={({field}) => (
                            <FormItem className='mt-1'>
                              <FormLabel className='flex flex-row items-center space-y-0 gap-1.5'>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value < 10}
                                    onCheckedChange={(checked) => field.onChange(checked ? 0 : 100)}
                                  />
                                </FormControl>
                              Black & White
                              </FormLabel>
                              <FormDescription />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value='background'>
                  <AccordionTrigger><span className='flex flex-row items-center gap-2 font-bold'><PaintbrushVertical className='stroke-accent' size={24} /> Background</span></AccordionTrigger>
                  <AccordionContent>
                    <div className='md:grid md:grid-cols-2 gap-2 w-full'>
                      <FormField
                        control={generationSettingsForm.control}
                        name='backgroundScale'
                        render={({field}) => (
                          <FormItem>
                            <FormLabel>
                            Background Scale (%)
                            </FormLabel>
                            <FormControl>
                              <Input type='number' {...field} />
                            </FormControl>
                            <FormDescription />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={generationSettingsForm.control}
                        name='backgroundVerticalPosition'
                        render={({field}) => (
                          <FormItem>
                            <FormLabel>
                            Background Position
                            </FormLabel>
                            <FormControl>
                              <Input type='number' {...field} />
                            </FormControl>
                            <FormDescription />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className='md:grid md:grid-cols-2 gap-2 w-full'>
                      <FormField
                        control={generationSettingsForm.control}
                        name='backgroundShape'
                        render={({field}) => (
                          <FormItem>
                            <FormLabel>
                            Background Shape
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder='Select a verified email to display' />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value='CIRCLE'>Round</SelectItem>
                                <SelectItem value='RECT'>Rectangular</SelectItem>
                                <SelectItem value='ROUNDEDRECT'>Rounded Rect</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={generationSettingsForm.control}
                      name='useBackgroundShapeAsImageMask'
                      render={({field}) => (
                        <FormItem className='mt-2.5'>
                          <FormLabel className='flex flex-row items-center space-y-0 gap-1.5'>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          Use Background Shape as Image Shape
                          </FormLabel>
                          <FormDescription />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value='border'>
                  <AccordionTrigger><span className='flex flex-row items-center gap-2 font-bold'><Frame className='stroke-accent' size={24} /> Border</span></AccordionTrigger>
                  <AccordionContent className='space-y-2'>
                    <FormField
                      control={generationSettingsForm.control}
                      name='border'
                      render={({field}) => (
                        <FormItem className='flex flex-row items-center space-y-0 gap-1.5'>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>
                          Draw Border
                          </FormLabel>
                          <FormDescription />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {isBorderEnabled ? (
                      <>
                        <FormField
                          control={generationSettingsForm.control}
                          name='borderLayer'
                          render={({field}) => (
                            <FormItem>
                              <FormLabel>
                              Border Layer
                              </FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value='FOREGROUND'>Over Subject</SelectItem>
                                  <SelectItem value='BACKGROUND'>Behind Subject</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className='md:grid md:grid-cols-2 gap-2 w-full'>
                          <FormField
                            control={generationSettingsForm.control}
                            name='borderColor'
                            render={({field}) => (
                              <FormItem>
                                <FormLabel>
                                Border Color
                                </FormLabel>
                                <FormControl>
                                  <Input type='color' {...field} />
                                </FormControl>
                                <FormDescription />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={generationSettingsForm.control}
                            name='borderThickness'
                            render={({field}) => (
                              <FormItem>
                                <FormLabel>
                                Border Thickness (px)
                                </FormLabel>
                                <FormControl>
                                  <Input type='number' {...field} />
                                </FormControl>
                                <FormDescription />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value='output'>
                  <AccordionTrigger><span className='flex flex-row items-center gap-2 font-bold'><Image className='stroke-accent' size={24} /> Output</span></AccordionTrigger>
                  <AccordionContent className='space-y-2'>
                    <div className='md:grid md:grid-cols-2 gap-2 w-full'>
                      <FormField
                        control={generationSettingsForm.control}
                        name='outputFormat'
                        render={({field}) => (
                          <FormItem>
                            <FormLabel>
                            Output File Format
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value='image/png'>PNG</SelectItem>
                                <SelectItem value='image/webp'>WEBP</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={generationSettingsForm.control}
                        name='outputSize'
                        render={({field}) => (
                          <FormItem>
                            <FormLabel>
                            Output Image Size (px)
                            </FormLabel>
                            <FormControl>
                              <Input type='number' {...field} />
                            </FormControl>
                            <FormDescription />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </form>
          </Form>
        </div>
        <div className='flex-grow'>
          {editorState.state === 'ERROR' ? (
            <div className='mx-auto px-8 text-red-700 text-center'>
              <TriangleAlert className='mx-auto' size={48} />
              <p className='font-bold text-lg'>{editorState.errorMessage}</p>
            </div>
          ) : (editorState.state === 'DONE' && generatedImageDataUrl != null) ? (
            <div className='text-center'>
              <img src={generatedImageDataUrl} className='w-96 h-auto aspect-square mx-auto' alt='generated output image' />
              <div className='mt-4 mx-auto'>
                <Button className='bg-accent text-accent-foreground' size='sm' onClick={downloadFileOnClick(generatedImageDataUrl)}>Download Image</Button>
              </div>
            </div>
          ) : (editorState.state === 'READY') ? null : (
            <div className='text-center animate-pulse'>
              <Loader2 className='animate-spin stroke-accent mx-auto' size={48} />
              <span className='text-accent font-bold text-lg'>Processing</span>
            </div>
          )}
        </div>
      </main>
      <footer className='px-8'>
        <div className='mt-2.5'>
          {editorState.state === 'DONE' ? (
            <p className='text-xs font-mono mb-1.5'>bg removal
              took {editorState.processingSeconds.toLocaleString(undefined, {maximumFractionDigits: 2})}s</p>
          ) : null}
          <p className='text-sm'>
            Powered by <a className='underline' href='https://huggingface.co/briaai/RMBG-1.4/' target='_blank' rel='nofollow'>RMBG-1.4</a><br />
            Made my <a className='underline' href='https://twitter.com/JonasDoesThings' target='_blank'>JonasDoesThings</a>, source code on <a className='underline' href='https://github.com/JonasDoesThings/magicpfp' target='_blank'>GitHub</a>
          </p>
        </div>
      </footer>
    </>
  );
}
