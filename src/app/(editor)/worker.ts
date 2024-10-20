import {
  AutoModel,
  AutoProcessor,
  RawImage,
  env,
  type Processor,
  type PreTrainedModel, type Tensor,
} from '@huggingface/transformers';
import {type RemoveImgBackgroundWorkerResponse} from '~/lib/ApplicationState';

// Since we will download the model from the Hugging Face Hub, we can skip the local model check
env.allowLocalModels = false;

// Use the Singleton pattern to enable lazy construction of the pipeline.
class ModelProcessorSingleton {
  static instance: [model: PreTrainedModel, processor: Processor]|null = null;

  static async getInstance() {
    if (this.instance === null) {
      // Using experimental transformers.js v3 alpha with WebGPU Support (https://github.com/xenova/transformers.js/pull/545)
      const model = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
        device: ('gpu' in navigator) ? 'webgpu' : undefined,
        dtype: 'fp16', // fp16 or fp32, TODO: what's the REAL difference for our use?
      });

      const processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
        // Do not require config.json to be present in the repository
        // TODO: do I need this???
        // config: {
        //   do_normalize: true,
        //   do_pad: false,
        //   do_rescale: true,
        //   do_resize: true,
        //   image_mean: [0.5, 0.5, 0.5],
        //   feature_extractor_type: "ImageFeatureExtractor",
        //   image_std: [1, 1, 1],
        //   resample: 2,
        //   rescale_factor: 0.00392156862745098,
        //   size: { width: 1024, height: 1024 },
        // }
      });

      this.instance = [model, processor];
    }
    return this.instance;
  }
}

function trimOffscreenCanvas(canvas: OffscreenCanvas, alphaThreshold = 48) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context.');

  const {width, height} = canvas;
  const {data} = ctx.getImageData(0, 0, width, height);

  const isTransparent = (x: number, y: number) => (data[(y * width + x) * 4 + 3] ?? -1) <= alphaThreshold;

  let top = 0, bottom = height - 1, left = 0, right = width - 1;

  while (top < height && Array.from({length: width}, (_, x) => isTransparent(x, top)).every(Boolean)) top++;
  while (bottom > top && Array.from({length: width}, (_, x) => isTransparent(x, bottom)).every(Boolean)) bottom--;
  while (left < width && Array.from({length: height}, (_, y) => isTransparent(left, y)).every(Boolean)) left++;
  while (right > left && Array.from({length: height}, (_, y) => isTransparent(right, y)).every(Boolean)) right--;

  const trimmedWidth = right - left + 1;
  const trimmedHeight = bottom - top + 1;

  // Return empty canvas if no non-transparent pixels were found
  if (trimmedWidth <= 0 || trimmedHeight <= 0) return new OffscreenCanvas(0, 0);

  const trimmedCanvas = new OffscreenCanvas(trimmedWidth, trimmedHeight);
  trimmedCanvas.getContext('2d')?.drawImage(canvas, left, top, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);

  return trimmedCanvas;
}

const onMessageReceived = async (evt: MessageEvent<{blobUrl: string; brandColor: string; horizontalPadding: number}>) => {
  const startTime = performance.now();

  postMessage({
    state: 'PROCESSING',
  } satisfies RemoveImgBackgroundWorkerResponse);

  // Retrieve the classification pipeline. When called for the first time,
  // this will load the pipeline and save it for future use.
  const [model, processor] = await ModelProcessorSingleton.getInstance();

  // Read image
  const image = await RawImage.fromURL(evt.data.blobUrl);

  // Preprocess image
  console.time('processor');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const {pixel_values} = await processor(image);
  console.timeEnd('processor');

  // Predict alpha matte
  console.time('model');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const {output}: {output: Tensor[]} = await model({input: pixel_values});
  console.timeEnd('model');

  if(!output[0]) throw new Error('output was null');

  // Resize mask back to original size
  const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);

  // Create new canvas
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  if(!ctx) throw new Error('failed rendering');

  // Draw original image output to canvas
  ctx.drawImage(image.toCanvas() as CanvasImageSource, 0, 0);

  // Update alpha channel
  const pixelData = ctx.getImageData(0, 0, image.width, image.height);
  for (let i = 0; i < mask.data.length; ++i) {
    // @ts-expect-error :( sad
    pixelData.data[4 * i + 3] = mask.data[i];
  }
  ctx.putImageData(pixelData, 0, 0);

  const croppedSubject = trimOffscreenCanvas(canvas);
  // Send the output back to the main thread
  self.postMessage({
    state: 'DONE',
    //originalImageDataUrl: evt.data.blobUrl,
    //processedSubject: await croppedSubject.convertToBlob(),
    processingSeconds: (performance.now() - startTime) / 1000,
    processedSubjectImage: await croppedSubject.convertToBlob(),
  } satisfies RemoveImgBackgroundWorkerResponse);
};

self.addEventListener('message', (evt: MessageEvent) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  onMessageReceived(evt)
    .catch((err) => {
      self.postMessage({
        state: 'ERROR',
        errorMessage: (err as Error).message,
      } satisfies RemoveImgBackgroundWorkerResponse);
    });
});
