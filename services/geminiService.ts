import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from './audioUtils';
import { EFFECT_PROMPTS } from "../constants";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;

export const analyzeTextEmotion = async (text: string): Promise<string> => {
  const availableEffects = Object.keys(EFFECT_PROMPTS).filter(k => k !== 'normal' && k !== 'custom').join(', ');
  
  const prompt = `Analyze the primary emotion of the following text. Respond with ONLY ONE of the following keywords that best matches the tone: ${availableEffects}, or "normal" for a neutral tone.

Text: "${text}"

Keyword:`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const resultText = response.text.trim().toLowerCase();
    
    // Return the corresponding prompt prefix
    if (EFFECT_PROMPTS.hasOwnProperty(resultText)) {
      return EFFECT_PROMPTS[resultText];
    }
    return ''; // Default to normal if the response is unexpected
  } catch(error) {
    console.error("Error analyzing text emotion:", error);
    return ''; // Default to normal on error
  }
}

export const generateSpeech = async (text: string, voice: string, effect: string, audioContext: AudioContext): Promise<AudioBuffer> => {
  try {
    const prompt = `${effect}${text}`;
    
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

    const candidate = response?.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    const base64Audio = part?.inlineData?.data;

    if (!candidate || !part || !base64Audio) {
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
          throw new Error(`Speech generation failed: ${candidate.finishReason}. The prompt may have been blocked.`);
      }
      throw new Error("Invalid response from API. Could not extract audio data.");
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