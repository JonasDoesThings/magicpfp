'use client';
import {Input} from '~/components/ui/input';
import {Label} from '~/components/ui/label';
import {type ChangeEvent, useEffect, useRef, useState} from 'react';
import {type ApplicationState} from '~/lib/ApplicationState';
import {imageVariations, type PFPGenerationSettings, pfpGenerationSettingsSchema} from '~/lib/imageVariations';
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

export default function HomePage() {
  const [appState, setAppState] = useState<ApplicationState>({state: 'INITIALIZING'});
  const worker = useRef<Worker|null>(null);

  const fileInputRef = useRef<HTMLInputElement|null>(null);
  const generationSettingsForm = useForm<PFPGenerationSettings>({
    resolver: zodResolver(pfpGenerationSettingsSchema),
    defaultValues: {
      backgroundScale: 1,
      backgroundShape: 'CIRCLE',
      useBackgroundShapeAsImageMask: true,
      backgroundVerticalPosition: 1,
      brandColor: '#F1337F',
      subjectScale: 0.95,
      topMargin: 0,
      border: false,
      borderLayer: 'FOREGROUND',
      borderColor: 'black',
      borderThickness: 48,
    },
  });
  const isBorderEnabled = generationSettingsForm.watch('border');

  const uploadFile = (evt: ChangeEvent) => {
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

  const createVariations = async (generationSettings: PFPGenerationSettings, processedSubject: Blob) => {
    if(!processedSubject) {
      console.warn('no processedSubject');
      return [];
    }
    console.time('generating variations');

    const subjectImageBitmap = await createImageBitmap(processedSubject);

    const variations = await Promise.all(imageVariations.map(async (variation) => ({
      label: variation.label,
      blob: await variation.generate(subjectImageBitmap, generationSettings),
    })));
    console.timeEnd('generating variations');
    return variations;
  };

  const doRegenerate = async (values: PFPGenerationSettings, newAppState?: ApplicationState) => {
    const appStateToUse = newAppState ?? appState;
    if(appStateToUse.state !== 'DONE' || appStateToUse.processedSubject == null) return;

    const startTime = performance.now();
    const processedVariations = await createVariations(values, appStateToUse.processedSubject);

    setAppState({
      ...appStateToUse,
      processedVariations: processedVariations,
      variationGenerationSeconds: (performance.now() - startTime) / 1000,
    });
  };

  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      });
    }

    const onMessageReceived = async (evt: MessageEvent<ApplicationState>) => {
      if(evt.data.state === 'DONE') {
        setAppState({
          ...evt.data,
        });
        await generationSettingsForm.handleSubmit((data) => doRegenerate(data, evt.data))();
        return;
      }

      setAppState(evt.data);
    };

    const onErrorReceived = (evt: ErrorEvent) => {
      setAppState({state: 'ERROR', msg: (evt.error as Error).message});
    };

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    worker.current.addEventListener('message', onMessageReceived);
    worker.current.addEventListener('error', onErrorReceived);
    setAppState({state: 'READY'});

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      worker.current?.removeEventListener('message', onMessageReceived);
      worker.current?.removeEventListener('error', onErrorReceived);
    };
  }, []);

  if(appState.state === 'INITIALIZING') {
    return <p>Initializing Model</p>;
  }

  return (
    <main className='flex min-h-screen flex-col md:grid md:grid-cols-2 md:px-8 items-center justify-center'>
      <div className='w-full max-w-md flex flex-col gap-1.5'>
        <Form {...generationSettingsForm}>
          <form onSubmit={generationSettingsForm.handleSubmit((data) => doRegenerate(data))} className='space-y-1.5'>
            <div className='border p-6 bg-muted rounded-md space-y-4 [&_input]:bg-background'>
              <Label className='space-y-2.5'>
                <span>Picture</span>
                <Input type='file' onChange={uploadFile} ref={fileInputRef} />
              </Label>
              <FormField
                control={generationSettingsForm.control}
                name='brandColor'
                render={({field}) => (
                  <FormItem onBlur={generationSettingsForm.handleSubmit((data) => doRegenerate(data))}>
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
              <Button type='submit' className='w-full bg-pink-500' disabled={appState.state !== 'DONE' && appState.state !== 'READY'}>Generate</Button>
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
                            Scale
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
                            Background Scale
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
                                <SelectItem value='BACKGROUND'>Background</SelectItem>
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
                                Border Thickness
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
        <p className='mt-2.5 text-sm'>
          Powered by <a className='underline' href='https://huggingface.co/briaai/RMBG-1.4/' target='_blank' rel='nofollow'>RMBG-1.4</a><br />
          Made my <a className='underline' href='https://twitter.com/JonasDoesThings' target='_blank'>JonasDoesThings</a>, source code on <a className='underline' href='https://github.com/JonasDoesThings/magicpfp' target='_blank'>GitHub</a>
        </p>
      </div>
      <div>
        {appState.state === 'ERROR' ? (
          <p className='text-red-600'>Error: {appState.msg}</p>
        ) : appState.state === 'PROCESSING' ? (
          <p className='text-green-600'>Processing...</p>
        ) : appState.state === 'DONE' ? (
          <div>
            <p className='text-2xl font-bold text-left'>Original</p>
            <div className='flex flex-row flex-wrap justify-center gap-3'>
              <img src={appState.originalImageDataUrl} className='h-48 w-auto' alt='transparent subject' />
              <img src={URL.createObjectURL(appState.processedSubject)} className='h-48 w-auto'
                alt='transparent subject' />
            </div>
            <p className='text-2xl font-bold text-left mt-4'>Variations</p>
            {appState.processedVariations ? (
              <div className='flex flex-row flex-wrap justify-center gap-3'>
                {appState.processedVariations?.map(({label, blob}, i) => (
                  <div className='flex flex-col text-center items-center w-48' key={i}>
                    <img src={blob} className='h-48 w-auto' alt={label} />
                    <p className='text-sm font-mono'>{label}</p>
                  </div>
                ))}
              </div>
            ) : (<p>Generating Variations...</p>)}
            <p className='text-xs text-gray-600 font-mono'>bg removal took {appState.processingSeconds.toLocaleString(undefined, {maximumFractionDigits: 2})}s</p>
            {appState.variationGenerationSeconds ? (
              <p className='text-xs text-gray-600 font-mono'>variation generation took {appState.variationGenerationSeconds.toLocaleString(undefined, {maximumFractionDigits: 2})}s</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
