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

export const translateVideoText = async (textOrUrl: string, targetLanguage: string): Promise<string> => {
  try {
    const prompt = `The user has provided the following input:\n\n"${textOrUrl}"\n\nIf this input is a URL (such as a YouTube video link), you MUST use the Google Search tool to look up the exact URL. Find the authentic video title, channel name, and description. Do NOT hallucinate or guess the video content based on the URL string. After retrieving the true details of the video, provide a summary of its content in ${targetLanguage}, and suggest 2 realistically related videos in ${targetLanguage}. \n\nIf the input is just plain text, translate it directly to ${targetLanguage}.\n\nFormat your response to be spoken aloud (text-to-speech). DO NOT include markdown formatting or special characters that sound awkward when spoken.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return (response.text || '').trim();
  } catch (error) {
    console.error("Error translating video/text:", error);
    if (error instanceof Error) {
        throw new Error(`Translation/Search failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred during translation/search.");
  }
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  try {
    const prompt = `Translate the following text to ${targetLanguage}. Return ONLY the translated text, without any additional explanations or quotes.\n\nText: "${text}"`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return (response.text || '').trim();
  } catch (error) {
    console.error("Error translating text:", error);
    if (error instanceof Error) {
        throw new Error(`Translation failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred during translation.");
  }
};

export const generateSpeech = async (text: string, voice: string, effect: string, audioContext: AudioContext, isSsml: boolean = false): Promise<AudioBuffer> => {
  try {
    let prompt = text;
    if (isSsml) {
      prompt = (text.trim().startsWith('<speak>') && text.trim().endsWith('</speak>'))
        ? text.trim()
        : `<speak>${text}</speak>`;
    } else {
      prompt = `${effect}${text}`;
    }
    
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
          throw new Error(`Speech generation failed with reason: ${candidate.finishReason}. The content may have triggered safety filters.`);
      }
      throw new Error("Invalid response from Gemini API. Audio data was missing or malformed.");
    }

    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext, SAMPLE_RATE, NUM_CHANNELS);
    
    return audioBuffer;
  } catch (error) {
    console.error("Error generating speech:", error);
    if (error instanceof Error) {
        throw new Error(`Text-to-Speech API failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API to generate speech.");
  }
};