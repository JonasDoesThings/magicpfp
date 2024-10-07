import {z} from 'zod';
import tinycolor from 'tinycolor2';

export const OUTPUT_IMAGE_SIZE = 1024;

export const pfpGenerationSettingsSchema = z.object({
  brandColor: z.string(),
  backgroundShape: z.enum(['RECT', 'CIRCLE', 'ROUNDEDRECT']),
  imageShape: z.enum(['RECT', 'CIRCLE', 'ROUNDEDRECT']),
  backgroundVerticalPosition: z.coerce.number().min(0).max(2),
  backgroundScale: z.coerce.number().min(0).max(1),
  topMargin: z.coerce.number().min(-1).max(1),
  subjectScale: z.coerce.number().min(0).max(1.5),
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
        fillStyle: cssGradientToCanvasGradient(ctx, generationSettings.brandColor),
      });
      drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.subjectScale, generationSettings.topMargin);

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
      gradient.addColorStop(0.5, tinycolor(generationSettings.brandColor).toHexString());
      gradient.addColorStop(1, tinycolor(generationSettings.brandColor).darken(24).toHexString());
      drawCanvasBackground(ctx, generationSettings, {
        fillStyle: gradient,
      });

      drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.subjectScale, generationSettings.topMargin);

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
      gradient.addColorStop(0.5, tinycolor(generationSettings.brandColor).toHexString());
      gradient.addColorStop(1, tinycolor(generationSettings.brandColor).darken(24).toHexString());
      drawCanvasBackground(ctx, generationSettings, {
        fillStyle: gradient,
      });

      drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.subjectScale, generationSettings.topMargin);

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
      gradient.addColorStop(0.75, tinycolor(generationSettings.brandColor).toHexString());
      gradient.addColorStop(1, tinycolor(generationSettings.brandColor).toHexString());
      drawCanvasBackground(ctx, generationSettings, {
        fillStyle: gradient,
      });
      drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.subjectScale, generationSettings.topMargin);

      return finishCanvas(canvas, generationSettings);
    },
  },
  {
    label: 'Hollow Rings',
    generate: async (subject: ImageBitmap, generationSettings) => {
      generationSettings.backgroundScale = 1;
      generationSettings.backgroundVerticalPosition = 1;
      generationSettings.border = false;
      generationSettings.subjectScale = 0.9;

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
      gradient.addColorStop(0, tinycolor(generationSettings.brandColor).toHexString());
      gradient.addColorStop(0.2, tinycolor(generationSettings.brandColor).toHexString());
      gradient.addColorStop(0.2, 'white');
      gradient.addColorStop(0.4, 'white');
      gradient.addColorStop(0.4, tinycolor(generationSettings.brandColor).toHexString());
      gradient.addColorStop(0.6, tinycolor(generationSettings.brandColor).toHexString());
      gradient.addColorStop(0.6, 'white');
      gradient.addColorStop(0.8, 'white');
      gradient.addColorStop(0.8, tinycolor(generationSettings.brandColor).toHexString());
      gradient.addColorStop(1, tinycolor(generationSettings.brandColor).toHexString());
      drawCanvasBackground(ctx, generationSettings, {
        fillStyle: gradient,
      });
      drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.subjectScale, generationSettings.topMargin);

      return finishCanvas(canvas, generationSettings);
    },
  },
];

function cssGradientToCanvasGradient(ctx: OffscreenCanvasRenderingContext2D, gradientStr: string, width = OUTPUT_IMAGE_SIZE, height = OUTPUT_IMAGE_SIZE) {
  // Extract the gradient type and the rest of the gradient string
  const gradientTypeMatch = /(linear|radial)-gradient\((.*)\)/.exec(gradientStr);
  if (!gradientTypeMatch) {
    return gradientStr;
  }

  const gradientType = gradientTypeMatch[1]; // 'linear' or 'radial'
  let gradientParams = gradientTypeMatch[2]!.split(/,(?![^(]*\))/); // Split by commas but ignore those inside rgba()

  let canvasGradient: CanvasGradient;

  // Handle linear gradient with angle
  if (gradientType === 'linear') {
    let angle = 0;
    const angleMatch = /(\d+)deg/.exec((gradientParams[0]!));

    // Check if an angle is provided
    if (angleMatch) {
      angle = parseFloat(angleMatch[1]!);
      gradientParams = gradientParams.slice(1); // Remove angle from params
    }

    // Convert the angle to coordinates for `createLinearGradient`
    const radians = (angle * Math.PI) / 180;
    const x1 = 0.5 * (1 + Math.cos(radians)) * width;
    const y1 = 0.5 * (1 + Math.sin(radians)) * height;
    const x0 = width - x1;
    const y0 = height - y1;

    canvasGradient = ctx.createLinearGradient(x0, y0, x1, y1);

  } else if (gradientType === 'radial') {
    // Assuming a simple radial gradient centered in the canvas
    const radius = Math.min(width, height) / 2;
    canvasGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, radius);
  } else {
    throw new Error('Unsupported gradient type');
  }

  // Parse color stops and add them to the gradient
  gradientParams.forEach((param) => {
    const colorStopMatch = /(rgba?\([^)]+\))\s*(\d+)%/i.exec(param);
    if (colorStopMatch) {
      const color = colorStopMatch[1]!.trim();
      const stop = parseFloat(colorStopMatch[2]!) / 100;
      canvasGradient.addColorStop(stop, color);
    } else {
      console.warn('Invalid color stop:', param);
    }
  });

  return canvasGradient;
}




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

function drawImageToCanvasRespectingRatio(drawingTargetCtx: OffscreenCanvasRenderingContext2D, subjectToPaint: ImageBitmap, subjectScale: number, topMargin: number) {
  const {width, height} = subjectToPaint;

  const squareSize = drawingTargetCtx.canvas.width;

  const scale = Math.min(squareSize / width, squareSize / height) * subjectScale;
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
