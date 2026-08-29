import { SourceVideo } from '../types';

export const SAMPLE_VIDEOS: SourceVideo[] = [
  {
    id: 'sample-nature-aerial',
    name: 'Coastal_Aerial_4K_Cinematic.mp4',
    size: 48920400, // ~46.6 MB
    formattedSize: '46.6 MB',
    duration: 18.5,
    formattedDuration: '00:18',
    resolution: {
      width: 3840,
      height: 2160,
      label: '4K UHD (3840x2160)',
    },
    fps: 60,
    bitrate: '21.2 Mbps',
    codec: 'H.264 / AVC (High@L5.1)',
    audioChannels: 'Stereo 48kHz AAC',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    isSample: true,
  },
  {
    id: 'sample-product-tech',
    name: 'Tech_Smartphone_Commercial_Master.mp4',
    size: 29400200, // ~28 MB
    duration: 15.0,
    formattedSize: '28.0 MB',
    formattedDuration: '00:15',
    resolution: {
      width: 1920,
      height: 1080,
      label: '1080p FHD (1920x1080)',
    },
    fps: 30,
    bitrate: '14.8 Mbps',
    codec: 'H.264 / AVC',
    audioChannels: 'Stereo 48kHz AAC',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    isSample: true,
  },
  {
    id: 'sample-urban-lifestyle',
    name: 'Urban_Streetwear_Reel_Source.mp4',
    size: 34100000, // ~32.5 MB
    duration: 22.4,
    formattedSize: '32.5 MB',
    formattedDuration: '00:22',
    resolution: {
      width: 1920,
      height: 1080,
      label: '1080p FHD (1920x1080)',
    },
    fps: 59.94,
    bitrate: '12.0 Mbps',
    codec: 'H.264 / AVC',
    audioChannels: 'Stereo 48kHz AAC',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
    isSample: true,
  },
  {
    id: 'sample-fitness-action',
    name: 'Fitness_Workout_Promo_Vertical.mp4',
    size: 19500000, // ~18.6 MB
    duration: 12.0,
    formattedSize: '18.6 MB',
    formattedDuration: '00:12',
    resolution: {
      width: 1080,
      height: 1920,
      label: '9:16 Vertical (1080x1920)',
    },
    fps: 60,
    bitrate: '13.0 Mbps',
    codec: 'H.265 / HEVC',
    audioChannels: 'Stereo 44.1kHz AAC',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
    isSample: true,
  }
];
