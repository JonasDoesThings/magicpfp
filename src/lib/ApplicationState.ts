export type ApplicationState =
  {state: "INITIALIZING"}
  |{state: "READY"}
  |{state: "DONE", processedSubject: Blob, originalImageDataUrl: string, processedVariations?: {label: string; blob: string}[], processingSeconds: number, variationGenerationSeconds?: number}
  |{state: "PROCESSING"}
  |{state: "ERROR", msg: string}
