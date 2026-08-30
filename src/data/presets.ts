import { VideoAdjustments, OptionalElementsConfig, MetadataTemplate } from '../types';

export const DEFAULT_METADATA_TEMPLATE: MetadataTemplate = {
  titlePattern: 'var_{n}_{uuid8}',
  commentPattern: 'id={uuid}',
  encoderPattern: 'Lavf61.7.{rev}',
};

export const DEFAULT_ADJUSTMENTS: VideoAdjustments = {
  cropReframe: 'center',
  zoomPercent: 100,
  rotation: 0,
  brightness: 0,
  contrast: 1.0,
  saturation: 100,
  colorTemperature: 0,
  playbackSpeed: 1.0,
  audioVolume: 100,
  pitchCorrection: true,
  horizontalFlip: false,
};

export const DEFAULT_OPTIONAL_ELEMENTS: OptionalElementsConfig = {
  introOutro: {
    introEnabled: false,
    introTitle: 'New Release',
    introDuration: 1.5,
    introStyle: 'fade-black',
    outroEnabled: false,
    outroCta: 'Subscribe & Follow',
    outroDuration: 2.0,
    outroStyle: 'blur-card',
  },
};
