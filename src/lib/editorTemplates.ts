import tinycolor from 'tinycolor2';
import {OUTPUT_IMAGE_SIZE, type PFPGenerationSettings, cssGradientToCanvasGradient, finishCanvas, drawCanvasBackground, drawImageToCanvasRespectingRatio} from '~/lib/imageVariations';

const RGBA_WHITE = 'rgba(255, 255, 255, 1)';

export const editorTemplates: Record<string, {
  templateGenerationSettingsOverwrites: Partial<PFPGenerationSettings> | ((generationSettings: PFPGenerationSettings) => Partial<PFPGenerationSettings>);
  generate: (subject: ImageBitmap, generationSettings: PFPGenerationSettings) => Promise<string>;
}> = {
  'default': {
    templateGenerationSettingsOverwrites: {},
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
  'gradient-background-lighter-darker': {
    templateGenerationSettingsOverwrites: (generationSettings) => ({
      brandColor: `linear-gradient(0deg,
        ${tinycolor(generationSettings.brandColor).lighten(32).toRgbString()} 0%,
        ${tinycolor(generationSettings.brandColor).toRgbString()} 50%,
        ${tinycolor(generationSettings.brandColor).darken(24).toRgbString()} 100%
      )`,
    }),
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
  'horizontal-gradient-background-lighter-darker': {
    templateGenerationSettingsOverwrites: (generationSettings) => ({
      brandColor: `linear-gradient(90deg,
        ${tinycolor(generationSettings.brandColor).lighten(32).toRgbString()} 0%,
        ${tinycolor(generationSettings.brandColor).toRgbString()} 50%,
        ${tinycolor(generationSettings.brandColor).darken(24).toRgbString()} 100%
      )`,
    }),
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
  'smaller-background': {
    templateGenerationSettingsOverwrites: (generationSettings) => ({
      backgroundScale: 0.75,
      backgroundVerticalPosition: 0.85,
      border: false,
      brandColor: `linear-gradient(0deg,
        ${tinycolor(generationSettings.brandColor).lighten(32).toRgbString()} 0%,
        ${tinycolor(generationSettings.brandColor).toRgbString()} 50%,
        ${tinycolor(generationSettings.brandColor).darken(24).toRgbString()} 100%
      )`,
    }),
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
  'hollow-ring': {
    templateGenerationSettingsOverwrites: (generationSettings) => ({
      backgroundScale: 1,
      backgroundVerticalPosition: 1,
      border: false,
      brandColor: `radial-gradient(${RGBA_WHITE} 0%, ${RGBA_WHITE} 75%, ${tinycolor(generationSettings.brandColor).toRgbString()} 75%, ${tinycolor(generationSettings.brandColor).toRgbString()} 100%)`,
    }),
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
  'multiple-hollow-rings': {
    templateGenerationSettingsOverwrites: (generationSettings) => ({
      backgroundScale: 1,
      backgroundVerticalPosition: 1,
      border: false,
      subjectScale: 0.9,
      brandColor: `radial-gradient(
        ${tinycolor(generationSettings.brandColor).toRgbString()} 0%,
        ${tinycolor(generationSettings.brandColor).toRgbString()} 20%,
        ${RGBA_WHITE} 20%,
        ${RGBA_WHITE} 40%,
        ${tinycolor(generationSettings.brandColor).toRgbString()} 40%,
        ${tinycolor(generationSettings.brandColor).toRgbString()} 60%,
        ${RGBA_WHITE} 60%,
        ${RGBA_WHITE} 80%,
        ${tinycolor(generationSettings.brandColor).toRgbString()} 80%,
        ${tinycolor(generationSettings.brandColor).toRgbString()} 100%
      )`,
    }),
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
};

