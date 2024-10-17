import {z, ZodBoolean, ZodEnum, ZodNumber} from 'zod';
import {parseAsBoolean, parseAsFloat, parseAsInteger, parseAsString, parseAsStringEnum} from 'nuqs';

export const pfpGenerationSettingsSchema = z.object({
  brandColor: z.string(),
  backgroundShape: z.enum(['RECT', 'CIRCLE', 'ROUNDEDRECT']),
  useBackgroundShapeAsImageMask: z.boolean(),
  backgroundVerticalPosition: z.coerce.number().min(0).max(2),
  backgroundScale: z.coerce.number().min(0).max(1.5),
  topMargin: z.coerce.number().min(-1).max(1),
  subjectScale: z.coerce.number().min(0).max(1.5),
  border: z.boolean(),
  borderLayer: z.enum(['BACKGROUND', 'FOREGROUND']),
  borderColor: z.string(),
  borderThickness: z.coerce.number().min(0).max(128),
  outputFormat: z.enum(['image/png', 'image/jpeg', 'image/webp']).default('image/png'),
  outputSize: z.coerce.number().int().min(64).max(4096).default(1024),
  subjectSaturation: z.coerce.number().min(0).max(200).default(100),
  subjectContrast: z.coerce.number().min(0).max(200).default(100),
  subjectBrightness: z.coerce.number().min(0).max(200).default(100),
  subjectShadow: z.boolean().default(false),
  backgroundImage: z.string().optional(),
});

export type PFPGenerationSettings = z.infer<typeof pfpGenerationSettingsSchema>

export async function generateOutputImage(subject: ImageBitmap, generationSettings: PFPGenerationSettings) {
  const canvas = new OffscreenCanvas(generationSettings.outputSize, generationSettings.outputSize);
  const ctx = canvas.getContext('2d')!;
  await drawCanvasBackground(ctx, generationSettings, {
    fillStyle: cssGradientToCanvasGradient(ctx, generationSettings.brandColor),
  });

  ctx.save();
  const filters: string[] = [''];
  if(generationSettings.subjectBrightness !== 100) {
    filters.push(`brightness(${generationSettings.subjectBrightness}%)`);
  }
  if(generationSettings.subjectSaturation !== 100) {
    filters.push(`saturate(${generationSettings.subjectSaturation}%)`);
  }
  if(generationSettings.subjectContrast !== 100) {
    filters.push(`contrast(${generationSettings.subjectContrast}%)`);
  }
  if(generationSettings.subjectShadow) {
    filters.push('drop-shadow(-10px 10px 15px rgba(0, 0, 0, 45%))');
  }

  if(filters.length > 0) ctx.filter = filters.join(' ');

  drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.subjectScale, generationSettings.topMargin);
  ctx.restore();

  return finishCanvas(canvas, generationSettings);
}

export const defaultGenerationSettings: PFPGenerationSettings = {
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
  borderThickness: 40,
  outputFormat: 'image/png',
  outputSize: 1024,
  subjectSaturation: 100,
  subjectContrast: 100,
  subjectBrightness: 100,
  subjectShadow: false,
};

export const pfpGenerationSettingsUrlParsingSchema = Object.fromEntries(Object.entries(pfpGenerationSettingsSchema.shape).map(([key, valueShape]) => ([key, ((() => {
  const defaultValue = defaultGenerationSettings[key as keyof PFPGenerationSettings];

  if(valueShape instanceof ZodNumber) {
    if(valueShape.isInt) {
      return parseAsInteger.withDefault(defaultValue as number);
    }
    return parseAsFloat.withDefault(defaultValue as number);
  }
  if(valueShape instanceof ZodBoolean) {
    return parseAsBoolean.withDefault(defaultValue as boolean);
  }
  if(valueShape instanceof ZodEnum) {
    return parseAsStringEnum(Object.values(valueShape.Values) as string[]).withDefault(defaultValue as string);
  }

  return parseAsString.withDefault(defaultValue as string);
})())])));

export function cssGradientToCanvasGradient(ctx: OffscreenCanvasRenderingContext2D, gradientStr: string) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  gradientStr = gradientStr.replace(/\s\s+/g, ' ');
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
    const radians = ((90 - angle) * Math.PI) / 180;
    const x2 = 0.5 * (1 + Math.cos(radians)) * width;
    const y2 = 0.5 * (1 + Math.sin(radians)) * height;
    const x1 = width - x2;
    const y1 = height - y2;

    canvasGradient = ctx.createLinearGradient(x1, y1, x2, y2);

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

async function drawCanvasBackground(ctx: OffscreenCanvasRenderingContext2D, generationSettings: PFPGenerationSettings, backgroundSettings: {fillStyle: CanvasFillStrokeStyles['fillStyle']}) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = backgroundSettings.fillStyle;

  ctx.rect(0, 0, generationSettings.outputSize, generationSettings.outputSize);

  ctx.fill();
  ctx.closePath();

  if(generationSettings.backgroundImage) {
    const bgImage = await new Promise<HTMLImageElement>((resolve) => {
      const backgroundImage = new Image();
      backgroundImage.src = generationSettings.backgroundImage!;
      backgroundImage.onload = () => {
        resolve(backgroundImage);
      };
    });

    ctx.drawImage(bgImage, 0, 0, generationSettings.outputSize, generationSettings.outputSize);
  }

  if(generationSettings.border && generationSettings.borderLayer === 'BACKGROUND') {
    drawBorder(ctx, generationSettings);
  }

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  if (generationSettings.backgroundShape === 'CIRCLE') {
    ctx.arc(
      generationSettings.outputSize / 2,
      generationSettings.outputSize - (generationSettings.outputSize * generationSettings.backgroundScale / 2 * (2 * generationSettings.backgroundVerticalPosition - 1)),
      generationSettings.outputSize * generationSettings.backgroundScale / 2,
      0, Math.PI * 2
    );
  } else if (generationSettings.backgroundShape === 'ROUNDEDRECT') {
    ctx.roundRect(
      (generationSettings.outputSize - generationSettings.outputSize * generationSettings.backgroundScale) / 2,
      (generationSettings.outputSize - generationSettings.outputSize * generationSettings.backgroundScale * generationSettings.backgroundVerticalPosition) + (72 / (Math.PI*4)),
      generationSettings.outputSize * generationSettings.backgroundScale,
      generationSettings.outputSize * generationSettings.backgroundScale,
      72
    );
  } else if(generationSettings.backgroundShape === 'RECT') {
    ctx.rect(
      (generationSettings.outputSize - generationSettings.outputSize * generationSettings.backgroundScale) / 2,
      generationSettings.outputSize - generationSettings.outputSize * generationSettings.backgroundScale * generationSettings.backgroundVerticalPosition,
      generationSettings.outputSize * generationSettings.backgroundScale,
      generationSettings.outputSize * generationSettings.backgroundScale,
    );
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBorder(ctx: OffscreenCanvasRenderingContext2D, generationSettings: PFPGenerationSettings) {
  if(!generationSettings.border) return;
  ctx.beginPath();
  ctx.lineWidth = generationSettings.borderThickness;
  ctx.strokeStyle = generationSettings.borderColor;

  switch(generationSettings.backgroundShape) {
  case 'RECT': {
    ctx.rect(
      (generationSettings.outputSize - (generationSettings.outputSize * generationSettings.backgroundScale)) / 2 + (generationSettings.borderThickness/2),
      generationSettings.outputSize - (generationSettings.outputSize * generationSettings.backgroundScale * generationSettings.backgroundVerticalPosition) + (generationSettings.borderThickness/2),
      (generationSettings.outputSize * generationSettings.backgroundScale) - (generationSettings.borderThickness),
      (generationSettings.outputSize * generationSettings.backgroundScale) - (generationSettings.borderThickness)
    );
    break;
  }
  case 'CIRCLE': {
    ctx.arc(
      generationSettings.outputSize / 2,
      generationSettings.outputSize - (generationSettings.outputSize * generationSettings.backgroundScale / 2 * (2 * generationSettings.backgroundVerticalPosition - 1)),
      generationSettings.outputSize * generationSettings.backgroundScale / 2 - (generationSettings.borderThickness / 2),
      0, Math.PI * 2
    );
    break;
  }
  case 'ROUNDEDRECT': {
    ctx.roundRect(
      (generationSettings.outputSize - (generationSettings.outputSize * generationSettings.backgroundScale)) / 2 + (generationSettings.borderThickness/2),
      generationSettings.outputSize - (generationSettings.outputSize * generationSettings.backgroundScale * generationSettings.backgroundVerticalPosition) + (generationSettings.borderThickness/2),
      (generationSettings.outputSize * generationSettings.backgroundScale) - (generationSettings.borderThickness),
      (generationSettings.outputSize * generationSettings.backgroundScale) - (generationSettings.borderThickness),
      35
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
  drawingTargetCtx.drawImage(
    subjectToPaint,
    0,
    -(topMargin * (squareSize / 2)),
    width,
    height,
    xOffset,
    squareSize - newHeight,
    newWidth, newHeight
  );
}

async function finishCanvas(canvas: OffscreenCanvas, generationSettings: PFPGenerationSettings) {
  const ctx = canvas.getContext('2d')!;

  if(generationSettings.border && generationSettings.borderLayer === 'FOREGROUND') {
    drawBorder(ctx, generationSettings);
  }

  if(generationSettings.useBackgroundShapeAsImageMask) {
    if(generationSettings.backgroundShape === 'CIRCLE') {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      ctx.arc(generationSettings.outputSize / 2, generationSettings.outputSize / 2, generationSettings.outputSize / 2, 0, Math.PI*2, true);
      ctx.closePath();
      ctx.fill();
    } else if(generationSettings.backgroundShape === 'ROUNDEDRECT') {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      ctx.roundRect(0, 0, generationSettings.outputSize, generationSettings.outputSize, 72);
      ctx.closePath();
      ctx.fill();
    }
  }

  return URL.createObjectURL(await canvas.convertToBlob({type: generationSettings.outputFormat}));
}
