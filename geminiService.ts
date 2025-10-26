import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from './audioUtils';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;

export const generateSpeech = async (text: string, voice: string, effect: string, audioContext: AudioContext): Promise<AudioBuffer> => {
  try {
    const prompt = `Say with a natural and engaging tone: ${effect}${text}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data received from API.");
    }

    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext, SAMPLE_RATE, NUM_CHANNELS);
    
    return audioBuffer;
  } catch (error) {
    console.error("Error generating speech:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate speech: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating speech.");
  }
};