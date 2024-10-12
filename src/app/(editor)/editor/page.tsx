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
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from '~/components/ui/form';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '~/components/ui/select';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '~/components/ui/accordion';
import {Checkbox} from '~/components/ui/checkbox';
import {Frame, PaintbrushVertical, ScanFace} from 'lucide-react';
import ColorPicker from 'react-best-gradient-color-picker';
import {Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger} from '~/components/ui/dialog';
import {debounce, handleFileUpload} from '~/lib/utils';
import {editorTemplates} from '~/lib/editorTemplates';
import {ProcessedSubjectImagePassingContext} from '~/components/ProcessedSubjectImagePassingContext';

export default function EditorPage() {
  // TODO: sync with url state
  // const [urlFormState, setUrlFormState] = useQueryStates(pfpGenerationSettingsUrlParsingSchema, {history: 'replace'});
  const [editorState, setEditorState] = useState<EditorState>({state: 'INITIALIZING'});
  const editorStateRef = useRef<typeof editorState|undefined>();
  editorStateRef.current = editorState;

  const {processedSubjectImage, setProcessedSubjectImage} = useContext(ProcessedSubjectImagePassingContext);
  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState<string|null>(null);

  const worker = useRef<Worker|null>(null);

  const {watch: watchForm, ...generationSettingsForm} = useForm<PFPGenerationSettings>({
    resolver: zodResolver(pfpGenerationSettingsSchema),
    mode: 'all',
    defaultValues: defaultGenerationSettings,
  });

  const generationSettingsFormRef = useRef<typeof generationSettingsForm|undefined>();
  generationSettingsFormRef.current = generationSettingsForm;
  const isBorderEnabled = watchForm('border');

  let subjectImageBitmap: ImageBitmap | null = null;
  const onFileUpload = handleFileUpload((blobUrl) => {
    worker.current?.postMessage({blobUrl});
  });

  const generateImage = async (generationSettings: PFPGenerationSettings, processedSubjectImage?: Blob) => {
    const startTime = performance.now();

    console.log('generatingImage', processedSubjectImage);
    if(!processedSubjectImage && editorState.state === 'DONE') {
      processedSubjectImage = editorState.processedSubjectImage;
    }

    if(!processedSubjectImage) {
      console.warn('no processedSubjectImage');
      return undefined;
    }

    console.time('generating output');
    subjectImageBitmap = await createImageBitmap(processedSubjectImage);
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
        processedSubjectImage: processedSubjectImage,
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
        setEditorState(evt.data);
        await generationSettingsForm.handleSubmit((data) =>
          generateImage(data, (evt.data as {processedSubjectImage: Blob}).processedSubjectImage))();
        break;
      }
      case 'ERROR': {
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
      setEditorState({state: 'ERROR', errorMessage: (evt.error as Error).message});
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
    const debouncedRegenerateForm = debounce((formData: PFPGenerationSettings) => {
      generationSettingsFormRef.current!.trigger()
        .then(async (isValid) => {
          if (!isValid) return;
          if (editorStateRef.current?.state !== 'DONE') return;
          await generateImage(formData, (editorStateRef.current as {processedSubjectImage: Blob}).processedSubjectImage);
        })
        .catch((err) => console.error(err));
    });

    const {unsubscribe} = watchForm((formData) => {
      debouncedRegenerateForm(formData as PFPGenerationSettings);
    });
    return () => unsubscribe();
  }, [watchForm]);

  if(editorState.state === 'INITIALIZING') {
    return <p>Initializing Model</p>;
  }

  return (
    <main className='flex min-h-screen flex-col md:grid md:grid-cols-2 md:px-8 items-center justify-center'>
      <div className='w-full max-w-md flex flex-col gap-1.5'>
        <Form watch={watchForm} {...generationSettingsForm}>
          <form onSubmit={generationSettingsForm.handleSubmit((data) => generateImage(data))} className='space-y-1.5'>
            <div className='border p-6 bg-muted rounded-md space-y-4 [&_input]:bg-background'>
              <Label className='space-y-2.5'>
                <span>Picture</span>
                <Input type='file' onChange={onFileUpload} />
              </Label>
              <FormField
                control={generationSettingsForm.control}
                name='brandColor'
                render={({field}) => (
                  <FormItem>
                    <FormLabel className='block'>
                      Background Color
                    </FormLabel>
                    <FormControl>
                      <Dialog>
                        <DialogTrigger className='w-full'>
                          <div className='w-full h-8 rounded-full flex items-center justify-center font-semibold font-mono text-xs text-white' style={{background: field.value}}></div>
                        </DialogTrigger>
                        <DialogContent className='px-4 w-auto' withoutCloseButton>
                          <DialogTitle className='sr-only'>Color Picker</DialogTitle>
                          <ColorPicker value={field.value} onChange={field.onChange} className='w-full' hideEyeDrop />
                          <DialogClose asChild><Button className='bg-accent'>Done</Button></DialogClose>
                        </DialogContent>
                      </Dialog>
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type='submit' className='w-full bg-pink-500' disabled={editorState.state !== 'DONE' && editorState.state !== 'READY'}>Generate</Button>
              {('gpu' in navigator) ? null : <span className='text-xs'>Your Browser does not support WebGPU. Processing will be slower.</span>}
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
                      <FormItem className='mt-1'>
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
            </Accordion>
          </form>
        </Form>
        <div className='mt-2.5'>
          {editorState.state === 'DONE' ? (
            <p className='text-xs font-mono mb-1.5'>bg removal took {editorState.processingSeconds.toLocaleString(undefined, {maximumFractionDigits: 2})}s</p>
          ) : null}
          <p className='text-sm'>
          Powered by <a className='underline' href='https://huggingface.co/briaai/RMBG-1.4/' target='_blank' rel='nofollow'>RMBG-1.4</a><br />
          Made my <a className='underline' href='https://twitter.com/JonasDoesThings' target='_blank'>JonasDoesThings</a>, source code on <a className='underline' href='https://github.com/JonasDoesThings/magicpfp' target='_blank'>GitHub</a>
          </p>
        </div>
      </div>
      <div>
        {editorState.state === 'ERROR' ? (
          <p className='text-red-600'>Error: {editorState.errorMessage}</p>
        ) : (editorState.state === 'DONE' && generatedImageDataUrl != null) ? (
          <div>
            <img src={generatedImageDataUrl} className='h-96 w-auto mx-auto' alt='generated output image' />
          </div>
        ) : (editorState.state === 'READY') ? null : (
          <p className='text-green-600'>Loading...</p>
        )}
      </div>
    </main>
  );
}
