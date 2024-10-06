import { z } from "zod";
import tinycolor from "tinycolor2";

export const OUTPUT_IMAGE_SIZE = 1024;

export const pfpGenerationSettingsSchema = z.object({
  brandColor: z.string(),
  backgroundShape: z.enum(["RECT", "CIRCLE", "ROUNDEDRECT"]),
  imageShape: z.enum(["RECT", "CIRCLE", "ROUNDEDRECT"]),
  backgroundVerticalPosition: z.coerce.number().min(0).max(2),
  backgroundScale: z.coerce.number().min(0).max(1),
  horizontalPadding: z.coerce.number().min(0).max(250)
});

export type PFPGenerationSettings = z.infer<typeof pfpGenerationSettingsSchema>

export const imageVariations: {
  label: string,
  generate: (subject: ImageBitmap, generationSettings: PFPGenerationSettings) => Promise<string>
}[] = [
  {
    label: "Solid Background",
    generate: async (subject: ImageBitmap, generationSettings) => {
      const canvas = new OffscreenCanvas(OUTPUT_IMAGE_SIZE, OUTPUT_IMAGE_SIZE);
      const ctx = canvas.getContext("2d")!;
      drawCanvasBackground(ctx, generationSettings, {
        fillStyle: generationSettings.brandColor
      });
      drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.horizontalPadding)

      return finishCanvas(canvas, generationSettings);
    }
  },
  {
    label: "Gradient Background",
    generate: async (subject: ImageBitmap, generationSettings) => {
      const canvas = new OffscreenCanvas(OUTPUT_IMAGE_SIZE, OUTPUT_IMAGE_SIZE);
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, 0, OUTPUT_IMAGE_SIZE);
      gradient.addColorStop(0, tinycolor(generationSettings.brandColor).lighten(32).toHexString());
      gradient.addColorStop(0.5, generationSettings.brandColor);
      gradient.addColorStop(1, tinycolor(generationSettings.brandColor).darken(24).toHexString());
      drawCanvasBackground(ctx, generationSettings, {
        fillStyle: gradient
      });
      drawImageToCanvasRespectingRatio(ctx, subject, generationSettings.horizontalPadding)

      return finishCanvas(canvas, generationSettings);
    }
  }
]

function drawCanvasBackground(ctx: OffscreenCanvasRenderingContext2D, generationSettings: PFPGenerationSettings, backgroundSettings: {fillStyle: CanvasFillStrokeStyles["fillStyle"]}) {
  ctx.beginPath();
  ctx.fillStyle = backgroundSettings.fillStyle;

  switch(generationSettings.backgroundShape) {
    case "RECT": {
      ctx.rect((OUTPUT_IMAGE_SIZE - (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale)) / 2, OUTPUT_IMAGE_SIZE - (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale * generationSettings.backgroundVerticalPosition), (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale), (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale));
      break;
    }
    case "CIRCLE": {
      const y = (OUTPUT_IMAGE_SIZE / 2) * (generationSettings.backgroundVerticalPosition/generationSettings.backgroundScale);
      ctx.ellipse((OUTPUT_IMAGE_SIZE / 2), y, (OUTPUT_IMAGE_SIZE / 2) * generationSettings.backgroundScale, (OUTPUT_IMAGE_SIZE / 2) * generationSettings.backgroundScale, 0, 0, 2 * Math.PI);
      break;
    }
    case "ROUNDEDRECT": {
      ctx.roundRect((OUTPUT_IMAGE_SIZE - (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale)) / 2, OUTPUT_IMAGE_SIZE - (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale * generationSettings.backgroundVerticalPosition), (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale), (OUTPUT_IMAGE_SIZE * generationSettings.backgroundScale), 72);
      break;
    }
    default: {
      throw new Error(`unknown background shape ${generationSettings.backgroundShape as string}`)
    }
  }
  ctx.fill();
  ctx.closePath();
}

function drawImageToCanvasRespectingRatio(drawingTargetCtx: OffscreenCanvasRenderingContext2D, subjectToPaint: ImageBitmap, paddingY = 50) {
  const { width, height } = subjectToPaint;
  const squareSize = drawingTargetCtx.canvas.width;

  // Calculate the scale to fit the image within the square
  const scale = Math.min((squareSize - (paddingY * 2)) / width, (squareSize) / height);
  const newWidth = width * scale;
  const newHeight = height * scale;

  // Calculate offset to center the image in the square canvas
  const xOffset = (squareSize - newWidth) / 2;

  // Draw the image onto the square canvas, preserving aspect ratio and centering it
  drawingTargetCtx.drawImage(subjectToPaint, 0, 0, width, height, xOffset, squareSize - newHeight, newWidth, newHeight);
}

async function finishCanvas(canvas: OffscreenCanvas, generationSettings: PFPGenerationSettings) {
  const ctx = canvas.getContext("2d")!;
  if(generationSettings.imageShape === "CIRCLE") {
    ctx.globalCompositeOperation = "destination-in"
    ctx.beginPath();
    ctx.arc(OUTPUT_IMAGE_SIZE / 2, OUTPUT_IMAGE_SIZE / 2, OUTPUT_IMAGE_SIZE / 2, 0, Math.PI*2, true);
    ctx.closePath();
    ctx.fill();
  } else if(generationSettings.imageShape === "ROUNDEDRECT") {
    ctx.globalCompositeOperation = "destination-in"
    ctx.beginPath();
    ctx.roundRect(0, 0, OUTPUT_IMAGE_SIZE, OUTPUT_IMAGE_SIZE, 72);
    ctx.closePath();
    ctx.fill();
  }

  return URL.createObjectURL(await canvas.convertToBlob())
}
