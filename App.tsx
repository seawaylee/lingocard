import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { CardDisplay } from './components/CardDisplay';
import { AppState, DifficultyLevel, LessonContent, ModelType } from './types';
import { generateLessonData, generateSceneImage } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    topic: '',
    difficulty: DifficultyLevel.Preschool,
    modelType: 'flash',
    isLoading: false,
    content: null,
    imageUrl: null,
    error: null,
  });

  const handleGenerate = async (topic: string, difficulty: DifficultyLevel, wordCount: number, modelType: ModelType) => {
    setAppState(prev => ({
      ...prev,
      topic,
      difficulty,
      modelType,
      isLoading: true,
      loadingStep: 'generating_text',
      error: null,
      content: null,
      imageUrl: null
    }));

    try {
      // 1. Generate Content
      const lessonData: LessonContent = await generateLessonData(topic, difficulty, wordCount, modelType);
      
      setAppState(prev => ({
          ...prev,
          content: lessonData,
          loadingStep: 'drawing_image'
      }));

      // 2. Generate Image (Wrapped in try-catch to not fail entire flow)
      let imageBase64: string | null = null;
      let finalPrompt = lessonData.fullPrompt || '';
      
      try {
        const result = await generateSceneImage(lessonData.topic, lessonData.imagePrompt, lessonData.vocabulary, modelType);
        imageBase64 = result.imageBase64;
        finalPrompt += `\n\n--- IMAGE PROMPT ---\n${result.finalPrompt}`;
      } catch (imgError) {
        console.error("Image generation failed, proceeding with text only.", imgError);
        // We do NOT set the global error here, so the user can still see the text content
      }

      const updatedLessonData = {
          ...lessonData,
          fullPrompt: finalPrompt
      };

      // 3. Finish (No Vision Step needed anymore as labels are baked in)
      setAppState(prev => ({
        ...prev,
        imageUrl: imageBase64,
        content: updatedLessonData,
        isLoading: false,
        loadingStep: undefined
      }));

    } catch (error: any) {
      console.error("Generation failed", error);
      
      setAppState(prev => ({
        ...prev,
        isLoading: false,
        error: "Failed to generate content. Please try again.",
      }));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-stone-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white p-4 border-b border-gray-200 flex justify-between items-center">
        <span className="font-bold text-lg text-gray-800">LingoCard AI</span>
      </div>

      <Sidebar 
        appState={appState} 
        onGenerate={handleGenerate} 
      />
      
      <main className="flex-1 h-full overflow-hidden relative">
          <CardDisplay appState={appState} />
          
          {/* Error Toast */}
          {appState.error && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium animate-bounce z-50">
                  {appState.error}
              </div>
          )}
      </main>
    </div>
  );
};

export default App;