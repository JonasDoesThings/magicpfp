import {z} from 'zod';
import tinycolor from 'tinycolor2';

export const OUTPUT_IMAGE_SIZE = 1024;

export const pfpGenerationSettingsSchema = z.object({
  brandColor: z.string(),
  backgroundShape: z.enum(['RECT', 'CIRCLE', 'ROUNDEDRECT']),
  imageShape: z.enum(['RECT', 'CIRCLE', 'ROUNDEDRECT']),
  backgroundVerticalPosition: z.coerce.number().min(0).max(2),
  backgroundScale: z.coerce.number().min(0).max(1),
  topPadding: z.coerce.number().min(-64).max(250),
  topMargin: z.coerce.number().min(-1).max(1),
  horizontalPadding: z.coerce.number().min(-64).max(250),
  border: z.boolean(),
  borderLayer: z.enum(['BACKGROUND', 'FOREGROUND']),
  borderColor: z.string(),
  borderThickness: z.coerce.number().min(0).max(128),
});

export type PFPGenerationSettings = z.infer<typeof pfpGenerationSettingsSchema>

export const imageVariations: {
  label: string;
  generate: (subject: ImageBitmap, generationSettings: PFPGenerationSettings) => Promise<string>;
}[] = [
  {
    label: 'Solid Background',
    generate: async (subject: ImageBitmap, generationSettings) => {
      const canvas = new OffscreenCanvas(OUTPUT_IMAGE_SIZE, OUTPUT_IMAGE_SIZE);
      const ctx = canvas.getContext('2d')!;
      drawCanvasBackground(ctx, generationSettings, {
        fillStyle: generationSettings.brandColor,
      });
      drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.horizontalPadding, generationSettings.topPadding, generationSettings.topMargin);

      return finishCanvas(canvas, generationSettings);
    },
  },
  {
    label: 'Gradient Background',
    generate: async (subject: ImageBitmap, generationSettings) => {
      const canvas = new OffscreenCanvas(OUTPUT_IMAGE_SIZE, OUTPUT_IMAGE_SIZE);
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, 0, OUTPUT_IMAGE_SIZE);
      gradient.addColorStop(0, tinycolor(generationSettings.brandColor).lighten(32).toHexString());
      gradient.addColorStop(0.5, generationSettings.brandColor);
      gradient.addColorStop(1, tinycolor(generationSettings.brandColor).darken(24).toHexString());
      drawCanvasBackground(ctx, generationSettings, {
        fillStyle: gradient,
      });
      drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.horizontalPadding, generationSettings.topPadding, generationSettings.topMargin);

      return finishCanvas(canvas, generationSettings);
    },
  },
  {
    label: 'Gradient Background',
    generate: async (subject: ImageBitmap, generationSettings) => {
      generationSettings.backgroundScale = 0.75;
      generationSettings.backgroundVerticalPosition = 0.85;
      generationSettings.border = false;

      const canvas = new OffscreenCanvas(OUTPUT_IMAGE_SIZE, OUTPUT_IMAGE_SIZE);
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, 0, OUTPUT_IMAGE_SIZE);
      gradient.addColorStop(0, tinycolor(generationSettings.brandColor).lighten(32).toHexString());
      gradient.addColorStop(0.5, generationSettings.brandColor);
      gradient.addColorStop(1, tinycolor(generationSettings.brandColor).darken(24).toHexString());
      drawCanvasBackground(ctx, generationSettings, {
        fillStyle: gradient,
      });
      drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.horizontalPadding, generationSettings.topPadding, generationSettings.topMargin);

      return finishCanvas(canvas, generationSettings);
    },
  },
  {
    label: 'Hollow Ring',
    generate: async (subject: ImageBitmap, generationSettings) => {
      generationSettings.backgroundScale = 1;
      generationSettings.backgroundVerticalPosition = 1;
      generationSettings.border = false;

      const canvas = new OffscreenCanvas(OUTPUT_IMAGE_SIZE, OUTPUT_IMAGE_SIZE);
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createRadialGradient(
        (OUTPUT_IMAGE_SIZE / 2),
        (OUTPUT_IMAGE_SIZE / 2) * (generationSettings.backgroundVerticalPosition/generationSettings.backgroundScale),
        0,
        (OUTPUT_IMAGE_SIZE / 2),
        (OUTPUT_IMAGE_SIZE / 2) * (generationSettings.backgroundVerticalPosition/generationSettings.backgroundScale),
        (OUTPUT_IMAGE_SIZE*generationSettings.backgroundScale/2),
      );
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(0.75, 'white');
      gradient.addColorStop(0.75, generationSettings.brandColor);
      gradient.addColorStop(1, generationSettings.brandColor);
      drawCanvasBackground(ctx, generationSettings, {
        fillStyle: gradient,
      });
      drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.horizontalPadding, generationSettings.topPadding, generationSettings.topMargin);

      return finishCanvas(canvas, generationSettings);
    },
  },
  {
    label: 'Hollow Rings',
    generate: async (subject: ImageBitmap, generationSettings) => {
      generationSettings.backgroundScale = 1;
      generationSettings.backgroundVerticalPosition = 1;
      generationSettings.border = false;

      const canvas = new OffscreenCanvas(OUTPUT_IMAGE_SIZE, OUTPUT_IMAGE_SIZE);
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createRadialGradient(
        (OUTPUT_IMAGE_SIZE / 2),
        (OUTPUT_IMAGE_SIZE / 2) * (generationSettings.backgroundVerticalPosition/generationSettings.backgroundScale),
        0,
        (OUTPUT_IMAGE_SIZE / 2),
        (OUTPUT_IMAGE_SIZE / 2) * (generationSettings.backgroundVerticalPosition/generationSettings.backgroundScale),
        (OUTPUT_IMAGE_SIZE*generationSettings.backgroundScale/2),
      );
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(0.25, 'white');
      gradient.addColorStop(0.25, generationSettings.brandColor);
      gradient.addColorStop(0.5, generationSettings.brandColor);
      gradient.addColorStop(0.5, 'white');
      gradient.addColorStop(0.75, 'white');
      gradient.addColorStop(0.75, generationSettings.brandColor);
      gradient.addColorStop(1, generationSettings.brandColor);
      drawCanvasBackground(ctx, generationSettings, {
        fillStyle: gradient,
      });
      drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.horizontalPadding, generationSettings.topPadding, generationSettings.topMargin);

      return finishCanvas(canvas, generationSettings);
    },
  },
];

function drawCanvasBackground(ctx: OffscreenCanvasRenderingContext2D, generationSettings: PFPGenerationSettings, backgroundSettings: {fillStyle: CanvasFillStrokeStyles['fillStyle']}) {
  ctx.beginPath();
  ctx.fillStyle = backgroundSettings.fillStyle;

  switch(generationSettings.backgroundShape) {
  case 'RECT': {
    ctx.rect((OUTPUT_IMAGE_SIZE - (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale)) / 2, OUTPUT_IMAGE_SIZE - (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale * generationSettings.backgroundVerticalPosition), (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale), (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale));
    break;
  }
  case 'CIRCLE': {
    ctx.ellipse(
      (OUTPUT_IMAGE_SIZE / 2),
      (OUTPUT_IMAGE_SIZE / 2) * (generationSettings.backgroundVerticalPosition/generationSettings.backgroundScale),
      (OUTPUT_IMAGE_SIZE / 2) * generationSettings.backgroundScale,
      (OUTPUT_IMAGE_SIZE / 2) * generationSettings.backgroundScale,
      0, 0, 2 * Math.PI
    );

    break;
  }
  case 'ROUNDEDRECT': {
    ctx.roundRect((OUTPUT_IMAGE_SIZE - (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale)) / 2, OUTPUT_IMAGE_SIZE - (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale * generationSettings.backgroundVerticalPosition), (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale), (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale), 72);
    break;
  }
  default: {
    throw new Error(`unknown background shape ${generationSettings.backgroundShape as string}`);
  }
  }
  ctx.fill();
  ctx.closePath();

  if(generationSettings.border && generationSettings.borderLayer === 'BACKGROUND') {
    drawBorder(ctx, generationSettings);
  }
}

function drawBorder(ctx: OffscreenCanvasRenderingContext2D, generationSettings: PFPGenerationSettings) {
  if(!generationSettings.border) return;
  ctx.beginPath();
  ctx.lineWidth = generationSettings.borderThickness;
  ctx.strokeStyle = generationSettings.borderColor;

  switch(generationSettings.backgroundShape) {
  case 'RECT': {
    ctx.rect(
      (OUTPUT_IMAGE_SIZE - (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale)) / 2 + (generationSettings.borderThickness/2),
      OUTPUT_IMAGE_SIZE - (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale * generationSettings.backgroundVerticalPosition) + (generationSettings.borderThickness/2),
      (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale) - (generationSettings.borderThickness),
      (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale) - (generationSettings.borderThickness)
    );
    break;
  }
  case 'CIRCLE': {
    ctx.ellipse(
      (OUTPUT_IMAGE_SIZE / 2),
      (OUTPUT_IMAGE_SIZE / 2) * (generationSettings.backgroundVerticalPosition/generationSettings.backgroundScale),
      (OUTPUT_IMAGE_SIZE / 2) * generationSettings.backgroundScale - (generationSettings.borderThickness/2),
      (OUTPUT_IMAGE_SIZE / 2) * generationSettings.backgroundScale - (generationSettings.borderThickness/2),
      0, 0, 2 * Math.PI
    );
    break;
  }
  case 'ROUNDEDRECT': {
    ctx.roundRect(
      (OUTPUT_IMAGE_SIZE - (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale)) / 2 + (generationSettings.borderThickness/2),
      OUTPUT_IMAGE_SIZE - (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale * generationSettings.backgroundVerticalPosition) + (generationSettings.borderThickness/2),
      (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale) - (generationSettings.borderThickness),
      (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale) - (generationSettings.borderThickness),
      50
    );
    break;
  }
  default: {
    throw new Error(`unknown background shape ${generationSettings.backgroundShape as string}`);
  }
  }

  ctx.closePath();
  ctx.stroke();
}

function drawImageToCanvasRespectingRatio(drawingTargetCtx: OffscreenCanvasRenderingContext2D, subjectToPaint: ImageBitmap, paddingY: number, paddingTop: number, topMargin: number) {
  const {width, height} = subjectToPaint;
  const squareSize = drawingTargetCtx.canvas.width;

  const scale = Math.min((squareSize - (paddingY * 2)) / width, (squareSize - paddingTop) / height);
  const newWidth = width * scale;
  const newHeight = height * scale;

  // Calculate offset to center the image in the square canvas
  const xOffset = (squareSize - newWidth) / 2;

  // Draw the image onto the square canvas, preserving aspect ratio and centering it
  drawingTargetCtx.drawImage(subjectToPaint, 0, -(topMargin * (OUTPUT_IMAGE_SIZE / 2)), width, height, xOffset, squareSize - newHeight, newWidth, newHeight);
}

async function finishCanvas(canvas: OffscreenCanvas, generationSettings: PFPGenerationSettings) {
  const ctx = canvas.getContext('2d')!;

  if(generationSettings.border && generationSettings.borderLayer === 'FOREGROUND') {
    drawBorder(ctx, generationSettings);
  }

  if(generationSettings.imageShape === 'CIRCLE') {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(OUTPUT_IMAGE_SIZE / 2, OUTPUT_IMAGE_SIZE / 2, OUTPUT_IMAGE_SIZE / 2, 0, Math.PI*2, true);
    ctx.closePath();
    ctx.fill();
  } else if(generationSettings.imageShape === 'ROUNDEDRECT') {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.roundRect(0, 0, OUTPUT_IMAGE_SIZE, OUTPUT_IMAGE_SIZE, 72);
    ctx.closePath();
    ctx.fill();
  }

  return URL.createObjectURL(await canvas.convertToBlob());
}
