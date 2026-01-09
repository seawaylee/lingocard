import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { DifficultyLevel, LessonContent, Vocabulary, ModelType } from "../types";

// Initialize the client
// We use 'as any' to bypass strict type checking for 'baseUrl' if the SDK version definitions are lagging,
// but the underlying transport supports it.
const ai = new GoogleGenAI({ 
  apiKey: 'sk-s1K4y2PE60DSlBQtZcLgvncSrAipZDzSnEejomeNlFR0u5S4',
  baseUrl: 'https://api.34ku.com',
  apiVersion: 'v1beta'
} as any);

// Model Configuration Map
const getModels = (type: ModelType) => {
  // Text model
  const fixedTextModel = 'gemini-3-flash-preview'; 
  
  // Vision model
  const fixedVisionModel = 'gemini-3-flash-preview';

  // Image model
  // Previous attempts:
  // - imagen-3.0-generate-001 -> 404 (Not Found)
  // - gemini-2.5-flash-image -> 404 (Not Found)
  // - gemini-2.0-flash-exp -> Returns text instead of image (No inlineData)
  // Trying gemini-1.5-pro as it is the most capable standard model that often supports image generation.
  const fixedImageModel = 'gemini-1.5-pro';

  if (type === 'pro') {
    return {
      text: 'gemini-3-flash-preview',
      image: fixedImageModel, 
      vision: fixedVisionModel
    };
  }
  
  // Flash mode
  return {
    text: fixedTextModel,
    image: fixedImageModel,
    vision: fixedVisionModel
  };
};

const ttsModel = 'gemini-2.5-flash-preview-tts';

// Audio Context Singleton
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
};

const getLessonSchema = (count: number): Schema => ({
  type: Type.OBJECT,
  properties: {
    vocabulary: {
      type: Type.ARRAY,
      description: `A list of exactly ${count} key vocabulary words related to the topic.`,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING, description: "The English word." },
          phonetic: { type: Type.STRING, description: "IPA phonetic transcription." },
          translation: { type: Type.STRING, description: "Simplified Chinese (简体中文) translation of the word." },
        },
        required: ["word", "phonetic", "translation"],
      },
    },
    sentences: {
      type: Type.ARRAY,
      description: "2 example sentences using the vocabulary.",
      items: {
        type: Type.OBJECT,
        properties: {
          english: { type: Type.STRING },
          chinese: { type: Type.STRING },
        },
        required: ["english", "chinese"],
      },
    },
    imagePrompt: {
      type: Type.STRING,
      description: "A simple visual description of the setting/background where these items would be found. Keep it brief.",
    },
  },
  required: ["vocabulary", "sentences", "imagePrompt"],
});

export const generateLessonData = async (
  topic: string, 
  difficulty: DifficultyLevel, 
  wordCount: number = 10, 
  modelType: ModelType = 'flash'
): Promise<LessonContent> => {
  try {
    const models = getModels(modelType);
    const prompt = `
      Create an English vocabulary lesson card for the topic: "${topic}".
      Difficulty Level: ${difficulty}.
      
      Requirements:
      1. Provide exactly ${wordCount} relevant vocabulary words.
      2. Provide 2 example sentences.
      3. Describe the scene simply for an image generator.
      4. ALL Chinese must be Simplified Chinese (简体中文).
    `;

    const response = await ai.models.generateContent({
      model: models.text,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getLessonSchema(wordCount),
        systemInstruction: "You are an expert ESL teacher creating study materials for Chinese students.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);
    return {
      topic,
      fullPrompt: prompt, 
      ...data,
    };
  } catch (error) {
    console.error("Error generating lesson text:", error);
    throw error;
  }
};

export const generateSceneImage = async (
  topic: string, 
  basePrompt: string, 
  vocabulary: Vocabulary[],
  modelType: ModelType = 'flash'
): Promise<{ imageBase64: string, finalPrompt: string }> => {
  try {
    const models = getModels(modelType);
    
    const vocabDescriptions = vocabulary.map(v => 
      `include a '${v.word}' object`
    ).join(', ');

    const finalPrompt = `
    Generate an image.
    A high-quality educational vector illustration of a ${topic}.
    
    Composition:
    - The scene contains: ${vocabDescriptions}.
    - Layout: Clean, organized, like a dictionary illustration or a seek-and-find game.
    - Background: Pure white background (#FFFFFF).
    
    Style:
    - Art Style: "Line Art" or "Vector Illustration" with thick black outlines (Cartoon/Doodle style).
    - Colors: Flat, bright colors.
    - Look and Feel: Cute, educational, professional (like Duolingo or textbooks).
    
    Important:
    - Leave some space between objects.
    - Do NOT add too much text manually, as we will add digital labels later.
    `;
    
    // Attempt to use generateContent with imageConfig for Gemini models.
    const imageConfig: any = {
        aspectRatio: "4:3",
    };

    const response = await ai.models.generateContent({
        model: models.image,
        contents: finalPrompt,
        config: {
            imageConfig: imageConfig
        }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
        const parts = candidates[0].content.parts;
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return {
                    imageBase64: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                    finalPrompt: finalPrompt
                };
            }
        }
        // If no image part found, check if there is text explaining why
        if (parts[0].text) {
             console.warn("Image generation returned text instead of image:", parts[0].text);
             throw new Error(`Model returned text: ${parts[0].text.substring(0, 100)}...`);
        }
    }
    
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const detectVocabularyPositions = async (
  imageBase64DataURI: string, 
  vocabulary: Vocabulary[],
  modelType: ModelType = 'flash'
): Promise<Vocabulary[]> => {
  try {
    const models = getModels(modelType);
    
    // Extract base64 from data URI
    const base64Data = imageBase64DataURI.split(',')[1];
    const mimeType = imageBase64DataURI.split(';')[0].split(':')[1];

    const wordsToFind = vocabulary.map(v => v.word).join(', ');
    
    const prompt = `
      I have an educational illustration of a ${vocabulary.length} items.
      
      Please identify the coordinates of the **OBJECTS** corresponding to these words: [${wordsToFind}].
      
      Return JSON: { "Word": { "x": 50, "y": 50 }, ... }
      (x and y are percentages 0-100 of the image width/height, representing the CENTER of the object).
    `;

    const response = await ai.models.generateContent({
      model: models.vision,
      contents: {
        role: 'user',
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text;
    if (!responseText) return vocabulary;

    const positions = JSON.parse(responseText);
    
    // Merge coordinates into vocabulary
    return vocabulary.map(v => {
      // Try exact match or case-insensitive match
      const coords = positions[v.word] || positions[Object.keys(positions).find(k => k.toLowerCase() === v.word.toLowerCase()) || ''];
      
      if (coords && typeof coords.x === 'number' && typeof coords.y === 'number') {
        return { ...v, coordinates: { x: coords.x, y: coords.y } };
      }
      return v;
    });

  } catch (error) {
    console.error("Error detecting object positions:", error);
    return vocabulary; // Return original array if detection fails
  }
};

// --- Audio Logic ---

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playTTS = async (text: string) => {
  if (!text || !text.trim()) return false;

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  try {
    const response = await ai.models.generateContent({
      model: ttsModel,
      contents: {
        role: 'user',
        parts: [{ text: text.trim() }]
      },
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
        console.warn("TTS Response did not contain inline audio data:", response);
        throw new Error("No audio generated");
    }

    const audioBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
    
    return true;
  } catch (e) {
    console.error("TTS Error:", e);
    return false;
  }
};