import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { DifficultyLevel, LessonContent, Vocabulary, ModelType } from "../types";

// Initialize the client with standard environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Model Configuration Map
const getModels = (type: ModelType) => {
  // Use 'gemini-2.5-flash-image' as the reliable standard image model
  // 'gemini-3-pro-image-preview' often requires special allowlisting or billing setup (403).
  // 'imagen-3.0' often returns 404 (Not Found).
  const imageModel = 'gemini-2.5-flash-image';
  
  if (type === 'pro') {
    return {
      text: 'gemini-3-pro-preview',
      image: imageModel, 
      vision: 'gemini-3-pro-preview'
    };
  }
  
  // Flash mode (Default)
  return {
    text: 'gemini-3-flash-preview',
    image: imageModel, 
    vision: 'gemini-3-flash-preview'
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
      description: "A description of a single cohesive scene where all these vocabulary items would naturally appear together.",
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
      3. Describe a single scene (imagePrompt) that naturally contains all these items.
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
    
    const vocabList = vocabulary.map(v => v.word).join(', ');

    // Optimized prompt matching the reference image style
    const finalPrompt = `
    Create a "Search and Find" style educational illustration for the topic: "${topic}".
    
    Scene Description: ${basePrompt}
    
    Vocabulary items to illustrate and label: ${vocabList}.
    
    **ART STYLE (Strict Adherence):**
    - **LIGNE CLAIRE / THICK OUTLINES**: All characters and objects MUST have distinct, consistent BLACK OUTLINES (cartoon vector art style).
    - **FLAT COLORING**: Use bright, solid colors. No complex shading or gradients.
    - **CUTE & CLEAN**: Characters should be cute and friendly. The scene must be organized, not messy.
    
    **LABELING STYLE (CRITICAL):**
    - **SPEECH BUBBLES**: Label the vocabulary items using **White Speech Bubbles** or **Rounded Rectangular Boxes** with a black outline.
    - **POINTERS**: The bubble should have a small tail or line pointing clearly to the object it names.
    - **TEXT**: Write the **ENGLISH WORD** inside the bubble.
    - **FONT**: Use a bold, clear, sans-serif font (like comic book lettering).
    - **ENGLISH ONLY**: Do NOT include Chinese.
    - **NO DUPLICATES**: Each word should appear exactly ONCE.
    
    **LAYOUT**:
    - Ensure objects are spaced out to allow room for the labels.
    - Avoid overlapping labels with objects.
    `;
    
    // Check if we are using an Imagen model
    if (models.image.includes('imagen')) {
        const response = await ai.models.generateImages({
            model: models.image,
            prompt: finalPrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '4:3',
                outputMimeType: 'image/jpeg'
            }
        });
        
        const b64 = response.generatedImages?.[0]?.image?.imageBytes;
        if (b64) {
             return {
                imageBase64: `data:image/jpeg;base64,${b64}`,
                finalPrompt: finalPrompt
            };
        }
    } else {
        // Use generateContent for Gemini series (gemini-2.5-flash-image)
        const response = await ai.models.generateContent({
            model: models.image,
            contents: {
              parts: [{ text: finalPrompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: "4:3",
                }
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
            if (parts[0].text) {
                 console.warn("Image generation returned text instead of image:", parts[0].text);
                 throw new Error(`Model returned text: ${parts[0].text.substring(0, 100)}...`);
            }
        }
    }
    
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
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