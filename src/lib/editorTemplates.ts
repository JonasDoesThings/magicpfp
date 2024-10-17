import tinycolor from 'tinycolor2';
import {
  type PFPGenerationSettings,
  generateOutputImage,
} from '~/lib/imageVariations';
import editorTemplateImages from '~/lib/editorTemplateImages';

const RGBA_WHITE = 'rgba(255, 255, 255, 1)';

const defaultGenerateFunction = generateOutputImage;

export const editorTemplates: Record<string, {
  templateGenerationSettingsOverwrites: Partial<PFPGenerationSettings> | ((generationSettings: PFPGenerationSettings) => Partial<PFPGenerationSettings>);
  generate: (subject: ImageBitmap, generationSettings: PFPGenerationSettings) => Promise<string>;
}> = {
  'default': {
    templateGenerationSettingsOverwrites: {},
    generate: defaultGenerateFunction,
  },
  'gradient-background-lighter-darker': {
    templateGenerationSettingsOverwrites: (generationSettings) => ({
      brandColor: `linear-gradient(0deg,
        ${tinycolor(generationSettings.brandColor).lighten(32).toRgbString()} 0%,
        ${tinycolor(generationSettings.brandColor).toRgbString()} 50%,
        ${tinycolor(generationSettings.brandColor).darken(24).toRgbString()} 100%
      )`,
    }),
    generate: defaultGenerateFunction,
  },
  'horizontal-gradient-background-lighter-darker': {
    templateGenerationSettingsOverwrites: (generationSettings) => ({
      brandColor: `linear-gradient(90deg,
        ${tinycolor(generationSettings.brandColor).lighten(32).toRgbString()} 0%,
        ${tinycolor(generationSettings.brandColor).toRgbString()} 50%,
        ${tinycolor(generationSettings.brandColor).darken(24).toRgbString()} 100%
      )`,
    }),
    generate: defaultGenerateFunction,
  },
  'smaller-background': {
    templateGenerationSettingsOverwrites: (generationSettings) => ({
      backgroundScale: 0.75,
      backgroundVerticalPosition: 1.08,
      border: false,
      brandColor: `linear-gradient(0deg,
        ${tinycolor(generationSettings.brandColor).lighten(32).toRgbString()} 0%,
        ${tinycolor(generationSettings.brandColor).toRgbString()} 50%,
        ${tinycolor(generationSettings.brandColor).darken(24).toRgbString()} 100%
      )`,
    }),
    generate: defaultGenerateFunction,
  },
  'smaller-background-bottom': {
    templateGenerationSettingsOverwrites: (generationSettings) => ({
      backgroundScale: 0.8,
      backgroundVerticalPosition: 0.8,
      subjectScale: 0.9,
      border: false,
      brandColor: `linear-gradient(0deg,
        ${tinycolor(generationSettings.brandColor).lighten(32).toRgbString()} 0%,
        ${tinycolor(generationSettings.brandColor).toRgbString()} 50%,
        ${tinycolor(generationSettings.brandColor).darken(24).toRgbString()} 100%
      )`,
    }),
    generate: defaultGenerateFunction,
  },
  'hollow-ring': {
    templateGenerationSettingsOverwrites: (generationSettings) => ({
      backgroundScale: 1,
      backgroundVerticalPosition: 1,
      border: false,
      brandColor: `radial-gradient(${RGBA_WHITE} 0%, ${RGBA_WHITE} 75%, ${tinycolor(generationSettings.brandColor).toRgbString()} 75%, ${tinycolor(generationSettings.brandColor).toRgbString()} 100%)`,
    }),
    generate: defaultGenerateFunction,
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
    generate: defaultGenerateFunction,
  },
  'default-black-and-white': {
    templateGenerationSettingsOverwrites: {
      subjectSaturation: 0,
      subjectContrast: 115,
    },
    generate: defaultGenerateFunction,
  },
  'smaller-square-bg': {
    templateGenerationSettingsOverwrites: {
      backgroundShape: 'RECT',
      backgroundScale: 0.7,
    },
    generate: defaultGenerateFunction,
  },
  'gradient-bg-img': {
    templateGenerationSettingsOverwrites: {
      backgroundImage: editorTemplateImages['vincent-maufay-DoMslaDppHk-unsplash.jpg'].data,
    },
    generate: defaultGenerateFunction,
  },
};
