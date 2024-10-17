export type EditorState =
  {state: 'INITIALIZING'}
  |{state: 'READY'}
  |{state: 'DONE'; processingSeconds: number}
  |{state: 'PROCESSING'}
  |{state: 'ERROR'; errorMessage: string}

export type RemoveImgBackgroundWorkerResponse =
  {state: 'PROCESSING'}
  |{state: 'DONE'; processedSubjectImage: Blob; processingSeconds: number}
  |{state: 'ERROR'; errorMessage: string}
