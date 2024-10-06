"use client"
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { type ApplicationState } from "~/lib/ApplicationState";
import { imageVariations, type PFPGenerationSettings, pfpGenerationSettingsSchema } from "~/lib/imageVariations";
import { Button } from "~/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

export default function HomePage() {
  const [appState, setAppState] = useState<ApplicationState>({state: "INITIALIZING"});
  const worker = useRef<Worker|null>(null);

  const fileInputRef = useRef<HTMLInputElement|null>(null);
  const generationSettingsForm = useForm<PFPGenerationSettings>({
    resolver: zodResolver(pfpGenerationSettingsSchema),
    defaultValues: {
      backgroundScale: 0.9,
      backgroundShape: "CIRCLE",
      imageShape: "CIRCLE",
      backgroundVerticalPosition: 1,
      brandColor: "#F1337F",
      horizontalPadding: 32,
    }
  })

  const uploadFile = (evt: ChangeEvent) => {
    const file = (evt.target as HTMLInputElement).files?.[0];
    if (!file) {
      console.debug("file was null")
      return;
    }

    const reader = new FileReader();

    // Set up a callback when the file is loaded
    reader.onload = async (onLoadEvt) => {
      if(!onLoadEvt.target?.result) {
        console.error("onLoadEvt.target(.result) was null")
        return;
      }

      worker.current?.postMessage({
        blobUrl: onLoadEvt.target.result as string,
      })
    }

    reader.readAsDataURL(file as Blob);
  }

  const createVariations = async (generationSettings: PFPGenerationSettings, processedSubject: Blob) => {
    if(!processedSubject) {
      console.warn("no processedSubject")
      return [];
    }
    console.time("generating variations")

    const subjectImageBitmap = await createImageBitmap(processedSubject);

    const variations = await Promise.all(imageVariations.map(async (variation) => ({
      label: variation.label,
      blob: await variation.generate(subjectImageBitmap, generationSettings)
    })));
    console.timeEnd("generating variations");
    return variations;
  }

  const doRegenerate = async (values: PFPGenerationSettings, newAppState?: ApplicationState) => {
    const appStateToUse = newAppState ?? appState;
    if(appStateToUse.state !== "DONE" || appStateToUse.processedSubject == null) return;

    setAppState({
      ...appStateToUse,
      processedVariations: await createVariations(values, appStateToUse.processedSubject),
    })
  }

  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module'
      });
    }

    const onMessageReceived = async (evt: MessageEvent<ApplicationState>) => {
      if(evt.data.state === "DONE") {
        setAppState({
          ...evt.data,
        })
        await generationSettingsForm.handleSubmit(data => doRegenerate(data, evt.data))();
        return;
      }

      setAppState(evt.data);
    };

    const onErrorReceived = (evt: ErrorEvent) => {
      setAppState({state: "ERROR", msg: (evt.error as Error).message})
    }

    worker.current.addEventListener("message", onMessageReceived);
    worker.current.addEventListener("error", onErrorReceived)
    setAppState({state: "READY"})

    return () => {
      worker.current?.removeEventListener('message', onMessageReceived)
      worker.current?.removeEventListener('error', onErrorReceived)
    };
  }, [])


    if(appState.state === "INITIALIZING") {
    return <p>Initializing Model</p>
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-sm flex flex-col gap-1.5">
        <Label>
          Picture
          <Input type="file" onChange={uploadFile} ref={fileInputRef} />
        </Label>
        <Form {...generationSettingsForm}>
          <form onSubmit={generationSettingsForm.handleSubmit((data) => doRegenerate(data))} className={"space-y-1.5"}>
            <FormField
              control={generationSettingsForm.control}
              name={"brandColor"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Primary Color
                  </FormLabel>
                  <FormControl>
                    <Input type={"color"} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={generationSettingsForm.control}
              name={"horizontalPadding"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Horizontal Padding
                  </FormLabel>
                  <FormControl>
                    <Input type={"number"} {...field} />
                  </FormControl>
                  <FormDescription />
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className={"md:grid md:grid-cols-2 gap-2 w-full"}>
              <FormField
                control={generationSettingsForm.control}
                name={"backgroundScale"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Background Scale
                    </FormLabel>
                    <FormControl>
                      <Input type={"number"} {...field} />
                    </FormControl>
                    <FormDescription />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={generationSettingsForm.control}
                name={"backgroundVerticalPosition"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Background Position
                    </FormLabel>
                    <FormControl>
                      <Input type={"number"} {...field} />
                    </FormControl>
                    <FormDescription />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
              <div className={"md:grid md:grid-cols-2 gap-2 w-full"}>
                <FormField
                  control={generationSettingsForm.control}
                  name={"backgroundShape"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Background Shape
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a verified email to display" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CIRCLE">Round</SelectItem>
                          <SelectItem value="RECT">Rectangular</SelectItem>
                          <SelectItem value="ROUNDEDRECT">Rounded Rect</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={generationSettingsForm.control}
                  name={"imageShape"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Image Shape
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a verified email to display" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CIRCLE">Round</SelectItem>
                          <SelectItem value="RECT">Rectangular</SelectItem>
                          <SelectItem value="ROUNDEDRECT">Rounded Rect</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type={"submit"} className={"w-full"}>Generate</Button>
          </form>
        </Form>
      </div>
      <hr className={"my-4 border w-full max-w-sm"} />
      <div>
        {appState.state === "ERROR" ? (
          <p className={"text-red-600"}>Error: {appState.msg}</p>
        ) : appState.state === "PROCESSING" ? (
          <p className={"text-green-600"}>Processing...</p>
        ) : appState.state === "DONE" ? (
          <div>
            <p className={"text-2xl font-bold text-left"}>Original</p>
            <div className={"flex flex-row flex-wrap justify-center gap-3"}>
              <img src={appState.originalImageDataUrl} className={"h-48 w-auto"} alt={"transparent subject"} />
              <img src={URL.createObjectURL(appState.processedSubject)} className={"h-48 w-auto"} alt={"transparent subject"} />
            </div>
            <p className={"text-2xl font-bold text-left mt-4"}>Variations</p>
            {appState.processedVariations ? (
              <div className={"flex flex-row flex-wrap justify-center gap-3"}>
                {appState.processedVariations?.map(({ label, blob }, i) => (
                  <div className={"flex flex-col text-center items-center w-48"} key={i}>
                    <img src={blob} className={"h-48 w-auto"} alt={label} />
                    <p className={"text-sm font-mono"}>{label}</p>
                  </div>
                ))}
              </div>
            ) : (<p>Generating Variations...</p>)}
            <p className={"text-xs text-gray-600 font-mono"}>took {appState.processingSeconds.toLocaleString(undefined, { maximumFractionDigits: 2 })}s</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
