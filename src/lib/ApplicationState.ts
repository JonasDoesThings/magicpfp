export type EditorState =
  {state: 'INITIALIZING'}
  |{state: 'READY'}
  |{state: 'DONE'; processedSubjectImage: Blob; processingSeconds: number}
  |{state: 'PROCESSING'}
  |{state: 'ERROR'; errorMessage: string}

export type RemoveImgBackgroundWorkerResponse =
  {state: 'DONE'; processedSubjectImage: Blob; processingSeconds: number}
  |{state: 'ERROR'; errorMessage: string}
