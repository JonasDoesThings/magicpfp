"use client"
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { type ApplicationState } from "~/lib/ApplicationState";
import { Checkbox } from "~/components/ui/checkbox";

export default function HomePage() {
  const [appState, setAppState] = useState<ApplicationState>({state: "INITIALIZING"})
  const brandColorInput = useRef<HTMLInputElement|null>(null);
  const horizontalPaddingInput = useRef<HTMLInputElement|null>(null);
  const worker = useRef<Worker|null>(null);

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
        brandColor: brandColorInput.current?.value ?? "#F1337F",
        horizontalPadding: horizontalPaddingInput.current?.value ?? 32,
      })
    }

    reader.readAsDataURL(file as Blob);
  }

  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module'
      });
    }

    const onMessageReceived = (evt: MessageEvent<ApplicationState>) => {
      setAppState(evt.data)
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
          <Input type="file" onChange={uploadFile} />
        </Label>
        <Label>
          Primary Color
          <Input type={"color"} defaultValue={"#F1337F"} ref={brandColorInput} />
        </Label>
        <Label>
          Horizontal Padding
          <Input type={"number"} defaultValue={32} min={0} max={300} ref={horizontalPaddingInput} />
        </Label>
        <Label className={"flex flex-row gap-2 items-center mt-2"}>
          <Checkbox onClick={(evt) => document.documentElement.style.setProperty("--variationsBorderRadius", evt.currentTarget.dataset.state !== "checked" ? "100%" : "0")} />
          Preview Round Images
        </Label>
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
              {appState.variationsBlobs.slice(0, 2).map(({ blob, label }, i) => (
                <div className={"flex flex-col text-center"} key={i}>
                  <img src={blob} className={"h-48 w-auto"} alt={label} />
                </div>
              ))}
            </div>
            <p className={"text-2xl font-bold text-left mt-4"}>Variations</p>
            <div className={"flex flex-row flex-wrap justify-center gap-3"}>
              {appState.variationsBlobs.slice(2).map(({ blob, label }, i) => (
                <div className={"flex flex-col text-center"} key={i}>
                  <img src={blob} className={"h-48 w-auto"} style={{ borderRadius: "var(--variationsBorderRadius)" }}
                       alt={label} />
                  <p className={"text-sm font-mono"}>{label}</p>
                </div>
              ))}
            </div>
            <p
              className={"text-xs text-gray-600 font-mono"}>took {appState.processingSeconds.toLocaleString(undefined, { maximumFractionDigits: 2 })}s</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
