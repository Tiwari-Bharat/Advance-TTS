import { VoiceOption } from './types';

export const AVAILABLE_VOICES: VoiceOption[] = [
  { value: 'Kore', label: 'Kore (Female, Clear)', description: 'A clear, professional female voice, great for narration.' },
  { value: 'Puck', label: 'Puck (Male, Warm)', description: 'A warm and friendly male voice, perfect for conversational content.' },
  { value: 'Charon', label: 'Charon (Male, Deep)', description: 'A deep, authoritative male voice, suitable for serious topics.' },
  { value: 'Fenrir', label: 'Fenrir (Female, Crisp)', description: 'A crisp, energetic female voice that captures attention.' },
  { value: 'Zephyr', label: 'Zephyr (Female, Gentle)', description: 'A gentle and soothing female voice, ideal for calming content.' },
  { value: 'Echo', label: 'Echo (Male, Resonant)', description: 'A resonant male voice with a commanding presence.' },
  { value: 'Calypso', label: 'Calypso (Female, Melodic)', description: 'A melodic and enchanting female voice, great for storytelling.' },
  { value: 'Boreas', label: 'Boreas (Male, Stern)', description: 'A stern and serious male voice, for formal announcements.' },
  { value: 'Amphion', label: 'Amphion (Male, Bardic)', description: 'A storytelling male voice with a dramatic flair.' },
];

export const PLAYBACK_SPEEDS: VoiceOption[] = [
  { value: '0.75', label: '0.75x' },
  { value: '1', label: 'Normal' },
  { value: '1.25', label: '1.25x' },
  { value: '1.5', label: '1.5x' },
];

export const SOUND_EFFECTS: VoiceOption[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'auto', label: 'Auto-Emotion' },
  { value: 'whisper', label: 'Whisper' },
  { value: 'laugh', label: 'Laughing' },
  { value: 'stutter', label: 'Stuttering' },
  { value: 'excited', label: 'Excited' },
  { value: 'sad', label: 'Sad' },
  { value: 'sneeze', label: 'Sneezing' },
  { value: 'custom', label: 'Custom Effect' },
];

export const EFFECT_PROMPTS: { [key: string]: string } = {
  whisper: 'In a whispering voice, say: ',
  laugh: 'With a laugh, say: ',
  stutter: 'Stuttering, say: ',
  excited: 'Excitedly, say: ',
  sad: 'Sadly, say: ',
  sneeze: '(sneezes) and then says: ',
  normal: '',
};


export const DEFAULT_TEXT = "I am build by Mr. Bharat Tiwari.";