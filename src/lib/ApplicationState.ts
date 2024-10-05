export type ApplicationState =
  {state: "INITIALIZING"}
  |{state: "READY"}
  |{state: "DONE", variationsBlobs: {label: string; blob: string}[], processingSeconds: number}
  |{state: "PROCESSING"}
  |{state: "ERROR", msg: string}

export type WorkerRequest =
  {}
