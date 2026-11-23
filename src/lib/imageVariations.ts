import {z, ZodBoolean, ZodEnum, ZodNumber} from 'zod';
import {parseAsBoolean, parseAsFloat, parseAsInteger, parseAsString, parseAsStringEnum} from 'nuqs';
import {GeistSans} from 'geist/font/sans';

export const pfpGenerationSettingsSchema = z.object({
  brandColor: z.string(),
  backgroundShape: z.enum(['RECT', 'CIRCLE', 'ROUNDEDRECT']),
  useBackgroundShapeAsImageMask: z.boolean(),
  backgroundRoundedRectBorderRadius: z.coerce.number().min(0).max(1),
  backgroundVerticalPosition: z.coerce.number().min(0).max(2),
  backgroundScale: z.coerce.number().min(0).max(1.5),
  subjectTopMargin: z.coerce.number().min(-2).max(2),
  subjectLeftMargin: z.coerce.number().min(-2).max(2),
  subjectRotation: z.coerce.number().min(-360).max(360).default(0),
  subjectScale: z.coerce.number().min(0).max(1.5),
  border: z.boolean(),
  borderTarget: z.enum(['BACKGROUND', 'SUBJECT']),
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
  badgeEnabled: z.boolean().default(false),
  badgeText: z.string(),
  badgeBackgroundColor: z.string().trim().min(0),
  badgeTextColor: z.string().trim().min(0),
  badgeTextLetterSpacing: z.coerce.number().min(0).max(2),
  badgeTextBold: z.boolean(),
  badgeFontSize: z.coerce.number().min(0).max(128),
});

export type PFPGenerationSettings = z.infer<typeof pfpGenerationSettingsSchema>

export async function generateOutputImage(subject: ImageBitmap, generationSettings: PFPGenerationSettings) {
  const canvas = new OffscreenCanvas(generationSettings.outputSize, generationSettings.outputSize);
  const ctx = canvas.getContext('2d')!;
  await drawCanvasBackground(ctx, generationSettings, {
    fillStyle: cssGradientToCanvasGradient(ctx, generationSettings.brandColor),
  });

  const drawSubjectOutline = generationSettings.border
    && generationSettings.borderTarget === 'SUBJECT'
    && generationSettings.borderThickness > 0;

  if(drawSubjectOutline) {
    ctx.save();
    if(generationSettings.subjectShadow) {
      ctx.filter = 'drop-shadow(-10px 10px 15px rgba(0, 0, 0, 45%))';
    }
    drawSubjectBorder(ctx, subject, generationSettings);
    ctx.restore();
  }

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
  if(generationSettings.subjectShadow && !drawSubjectOutline) {
    filters.push('drop-shadow(-10px 10px 15px rgba(0, 0, 0, 45%))');
  }

  if(filters.length > 0) ctx.filter = filters.join(' ');

  drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.subjectScale, generationSettings.subjectTopMargin, generationSettings.subjectLeftMargin, generationSettings.subjectRotation);
  ctx.restore();

  if(generationSettings.badgeEnabled) {
    drawBadge(ctx, generationSettings.badgeText, generationSettings);
  }

  return finishCanvas(canvas, generationSettings);
}

function drawBadge(ctx: OffscreenCanvasRenderingContext2D, text: string, generationSettings: PFPGenerationSettings) {
  ctx.save();
  const canvas = ctx.canvas;
  const paddingY = 10;
  const radius = canvas.width / 2 - paddingY;

  const centerX = radius + paddingY; // shift right slightly to fit the arc
  const centerY = canvas.height - radius - paddingY; // shift up slightly to fit the arc
  const lineWidth = generationSettings.badgeFontSize / 0.9;

  let fontSize = generationSettings.badgeFontSize;
  ctx.font = `${generationSettings.badgeTextBold ? 'bold ': ' '}${fontSize}px ${GeistSans.style.fontFamily}`; // Set font size based on arc thickness

  const measureTotalTextWidth = () => {
    let width = 0;
    for (const char of text) {
      width += ctx.measureText(char).width * generationSettings.badgeTextLetterSpacing;
    }
    return width;
  };

  const angularPadding = 1.5;
  // The arc wraps around the bottom-left corner of the canvas; anything wider than this would
  // start overlapping itself and make the gradient's color-stop offsets go out of order.
  const maxAngularWidth = Math.PI * 1.2;

  let totalTextWidth = measureTotalTextWidth();
  let totalAngularWidth = (totalTextWidth / radius) * angularPadding;

  if (totalAngularWidth > maxAngularWidth) {
    // Text is too long to fit around the arc at the configured size - shrink the font
    // proportionally so it fits, instead of letting the angle math overflow.
    fontSize *= maxAngularWidth / totalAngularWidth;
    ctx.font = `${generationSettings.badgeTextBold ? 'bold ': ' '}${fontSize}px ${GeistSans.style.fontFamily}`;
    totalTextWidth = measureTotalTextWidth();
    totalAngularWidth = Math.min((totalTextWidth / radius) * angularPadding, maxAngularWidth);
  }

  const bottomLeftCenter = (2*Math.PI) - (Math.PI/180)*225;
  const startAngle = bottomLeftCenter - totalAngularWidth / 2;
  const endAngle = bottomLeftCenter + totalAngularWidth / 2;

  const gradient = ctx.createConicGradient(
    bottomLeftCenter,
    ctx.canvas.width / 2,
    ctx.canvas.height / 2,
  );

  const startAngleInGradient = Math.abs(startAngle-bottomLeftCenter)/(Math.PI*2);
  const endAngleInGradient = 1-Math.abs(endAngle-bottomLeftCenter)/(Math.PI*2);

  gradient.addColorStop(0, generationSettings.badgeBackgroundColor);
  gradient.addColorStop(startAngleInGradient, generationSettings.badgeBackgroundColor);
  gradient.addColorStop(startAngleInGradient+0.05, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(startAngleInGradient+0.1, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(endAngleInGradient-0.05, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(endAngleInGradient-0.1, 'rgba(255, 255, 255, 0.0)');
  gradient.addColorStop(endAngleInGradient, generationSettings.badgeBackgroundColor);
  gradient.addColorStop(1, generationSettings.badgeBackgroundColor);

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle-1, endAngle+1, false);
  ctx.lineWidth = lineWidth * 2.5;
  ctx.strokeStyle = gradient;
  ctx.stroke();
  ctx.closePath();

  ctx.fillStyle = generationSettings.badgeTextColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textRadius = radius - lineWidth / 2;
  let currentAngle = (startAngle + endAngle) / 2 - totalAngularWidth/(2 + Math.cos(angularPadding % 1));
  text = text.split('').reverse().join('');
  for(const char of text) {
    const charWidth = ctx.measureText(char).width * generationSettings.badgeTextLetterSpacing;
    const charAngle = (charWidth / textRadius);

    const x = centerX + textRadius * Math.cos(currentAngle + charAngle / 2);
    const y = centerY + textRadius * Math.sin(currentAngle + charAngle / 2);
    const rotation = currentAngle + charAngle / 2 + Math.PI / 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(-1, -1);
    ctx.fillText(char, 0, 0);
    ctx.restore();

    currentAngle += charAngle;
  }
  ctx.restore();
}

export const defaultGenerationSettings: PFPGenerationSettings = {
  backgroundScale: 1,
  backgroundShape: 'CIRCLE',
  useBackgroundShapeAsImageMask: true,
  backgroundRoundedRectBorderRadius: 0.15,
  backgroundVerticalPosition: 1,
  brandColor: '#F1337F',
  subjectScale: 0.95,
  subjectTopMargin: 0,
  subjectLeftMargin: 0,
  border: false,
  borderTarget: 'BACKGROUND',
  borderLayer: 'BACKGROUND',
  borderColor: 'black',
  borderThickness: 33,
  outputFormat: 'image/png',
  outputSize: 1024,
  subjectSaturation: 100,
  subjectContrast: 100,
  subjectBrightness: 100,
  subjectShadow: false,
  subjectRotation: 0,
  badgeEnabled: false,
  badgeText: '#SMALLAI',
  badgeBackgroundColor: '#446E2E',
  badgeTextColor: '#FFFFFF',
  badgeTextLetterSpacing: 1.05,
  badgeTextBold: true,
  badgeFontSize: 90,
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

  if(generationSettings.border && generationSettings.borderTarget === 'BACKGROUND' && generationSettings.borderLayer === 'BACKGROUND') {
    drawBorder(ctx, generationSettings);
  }

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  if (generationSettings.backgroundShape === 'CIRCLE') {
    ctx.arc(
      generationSettings.outputSize / 2,
      generationSettings.outputSize - (generationSettings.outputSize * generationSettings.backgroundScale / 2 * (2 * generationSettings.backgroundVerticalPosition - 1)),
      generationSettings.outputSize * generationSettings.backgroundScale / 2,
      0, Math.PI * 2,
    );
  } else if (generationSettings.backgroundShape === 'ROUNDEDRECT') {
    ctx.roundRect(
      (generationSettings.outputSize - generationSettings.outputSize * generationSettings.backgroundScale) / 2,
      (generationSettings.outputSize - generationSettings.outputSize * generationSettings.backgroundScale * generationSettings.backgroundVerticalPosition) + (72 / (Math.PI*4)),
      generationSettings.outputSize * generationSettings.backgroundScale,
      generationSettings.outputSize * generationSettings.backgroundScale,
      generationSettings.backgroundRoundedRectBorderRadius * (generationSettings.outputSize/2),
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
      (generationSettings.outputSize * generationSettings.backgroundScale) - (generationSettings.borderThickness),
    );
    break;
  }
  case 'CIRCLE': {
    ctx.arc(
      generationSettings.outputSize / 2,
      generationSettings.outputSize - (generationSettings.outputSize * generationSettings.backgroundScale / 2 * (2 * generationSettings.backgroundVerticalPosition - 1)),
      generationSettings.outputSize * generationSettings.backgroundScale / 2 - (generationSettings.borderThickness / 2),
      0, Math.PI * 2,
    );
    break;
  }
  case 'ROUNDEDRECT': {
    ctx.roundRect(
      (generationSettings.outputSize - (generationSettings.outputSize * generationSettings.backgroundScale)) / 2 + (generationSettings.borderThickness/2),
      generationSettings.outputSize - (generationSettings.outputSize * generationSettings.backgroundScale * generationSettings.backgroundVerticalPosition) + (generationSettings.borderThickness/2),
      (generationSettings.outputSize * generationSettings.backgroundScale) - (generationSettings.borderThickness),
      (generationSettings.outputSize * generationSettings.backgroundScale) - (generationSettings.borderThickness),
      Math.max(0, generationSettings.backgroundRoundedRectBorderRadius * (generationSettings.outputSize/2) - (generationSettings.borderThickness/2)),
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

const SUBJECT_BORDER_ALPHA_THRESHOLD = 128;

// 1D squared Euclidean distance transform (Felzenszwalb & Huttenlocher).
function edt1d(
  f: Float64Array,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
  n: number,
) {
  let k = -1;
  for(let q = 0; q < n; q++) {
    const fq = f[q]!;
    if(!Number.isFinite(fq)) continue;

    if(k === -1) {
      k = 0;
      v[0] = q;
      z[0] = -Infinity;
      z[1] = Infinity;
      continue;
    }

    let s = ((fq + q * q) - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while(k > 0 && s <= z[k]!) {
      k--;
      s = ((fq + q * q) - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }

  if(k === -1) {
    d.fill(Infinity);
    return;
  }

  let j = 0;
  for(let p = 0; p < n; p++) {
    while(z[j + 1]! < p) j++;
    const dx = p - v[j]!;
    d[p] = dx * dx + f[v[j]!]!;
  }
}

function drawSubjectBorder(
  ctx: OffscreenCanvasRenderingContext2D,
  subject: ImageBitmap,
  generationSettings: PFPGenerationSettings,
) {
  const size = generationSettings.outputSize;
  const radius = generationSettings.borderThickness;
  if(radius <= 0) return;

  const borderCanvas = new OffscreenCanvas(size, size);
  const borderCtx = borderCanvas.getContext('2d', {willReadFrequently: true});
  if(!borderCtx) return;

  drawImageToCanvasRespectingRatio(
    borderCtx,
    subject,
    generationSettings.subjectScale,
    generationSettings.subjectTopMargin,
    generationSettings.subjectLeftMargin,
    generationSettings.subjectRotation,
  );

  const imageData = borderCtx.getImageData(0, 0, size, size);
  const data = imageData.data;

  const inner = Math.max(0, radius - 0.5);
  const outer = radius + 0.5;
  const innerSq = inner * inner;
  const outerSq = outer * outer;
  const maxDist = Math.ceil(outer) + 1;

  // Pass 1: exact vertical distance via two-pass linear scan on the binary alpha mask.
  const colDist = new Float32Array(size * size);
  for(let x = 0; x < size; x++) {
    let dist = maxDist;
    for(let y = 0; y < size; y++) {
      dist = data[(y * size + x) * 4 + 3]! >= SUBJECT_BORDER_ALPHA_THRESHOLD ? 0 : dist + 1;
      colDist[y * size + x] = dist;
    }
    dist = maxDist;
    for(let y = size - 1; y >= 0; y--) {
      const idx = y * size + x;
      const cur = colDist[idx]!;
      dist = cur === 0 ? 0 : dist + 1;
      const minD = dist < cur ? dist : cur;
      colDist[idx] = minD > outer ? Infinity : minD * minD;
    }
  }

  // Pass 2: horizontal 1D EDT to obtain exact 2D squared Euclidean distances.
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Int32Array(size);
  const z = new Float64Array(size + 1);

  for(let y = 0; y < size; y++) {
    const rowOffset = y * size;
    for(let x = 0; x < size; x++) {
      f[x] = colDist[rowOffset + x]!;
    }
    edt1d(f, d, v, z, size);
    for(let x = 0; x < size; x++) {
      const distSq = d[x]!;
      let alpha = 0;
      if(distSq <= innerSq) {
        alpha = 255;
      } else if(distSq < outerSq) {
        alpha = Math.round((outer - Math.sqrt(distSq)) * 255);
      }
      const idx = (rowOffset + x) * 4;
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = alpha;
    }
  }

  borderCtx.putImageData(imageData, 0, 0);
  borderCtx.globalCompositeOperation = 'source-in';
  borderCtx.fillStyle = generationSettings.borderColor;
  borderCtx.fillRect(0, 0, size, size);

  ctx.drawImage(borderCanvas, 0, 0);
}

function drawImageToCanvasRespectingRatio(drawingTargetCtx: OffscreenCanvasRenderingContext2D, subjectToPaint: ImageBitmap, subjectScale: number, subjectTopMargin: number, subjectLeftMargin: number, rotationDegrees: number) {
  const {width, height} = subjectToPaint;

  const squareSize = drawingTargetCtx.canvas.width;

  // Calculate the scaling factor to maintain aspect ratio
  const scale = Math.min(squareSize / width, squareSize / height) * subjectScale;
  const newWidth = width * scale;
  const newHeight = height * scale;

  // Calculate offset to center the image horizontally and vertically
  const xOffset = (squareSize - newWidth) / 2 + (subjectLeftMargin * squareSize / 2);
  const yOffset = squareSize - newHeight - (subjectTopMargin * squareSize / 2);

  // Save the current state of the canvas before applying transformations
  drawingTargetCtx.save();

  // Move the origin to the center of the image for rotation
  drawingTargetCtx.translate(xOffset + newWidth / 2, yOffset + newHeight / 2);

  // Rotate the canvas around the new origin (image center)
  drawingTargetCtx.rotate(rotationDegrees * (Math.PI / 180));

  // Move the canvas back to the top-left corner of where the image should be drawn
  drawingTargetCtx.translate(-newWidth / 2, -newHeight / 2);

  // Draw the image onto the rotated canvas
  drawingTargetCtx.drawImage(
    subjectToPaint,
    0,
    0,  // Use 0 for the source Y since we're handling all the positioning on the canvas side
    width,
    height,
    0,
    0,
    newWidth,
    newHeight,
  );

  // Restore the canvas state to undo the translation and rotation
  drawingTargetCtx.restore();
}

async function finishCanvas(canvas: OffscreenCanvas, generationSettings: PFPGenerationSettings) {
  const ctx = canvas.getContext('2d')!;

  if(generationSettings.border && generationSettings.borderTarget === 'BACKGROUND' && generationSettings.borderLayer === 'FOREGROUND') {
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
      ctx.roundRect(
        0,
        0,
        generationSettings.outputSize,
        generationSettings.outputSize,
        generationSettings.backgroundRoundedRectBorderRadius * (generationSettings.outputSize/2),
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  return URL.createObjectURL(await canvas.convertToBlob({type: generationSettings.outputFormat}));
}
