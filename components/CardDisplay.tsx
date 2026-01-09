import React from 'react';
import { AppState } from '../types';
import { Download, Share2, ImageOff } from 'lucide-react';

interface CardDisplayProps {
  appState: AppState;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({ appState }) => {
  const { content, imageUrl, isLoading, loadingStep } = appState;

  const getLoadingText = () => {
      switch(loadingStep) {
          case 'generating_text': return 'Planning lesson...';
          case 'drawing_image': return 'Illustrating scene...';
          case 'locating_objects': return 'Creating labels...';
          default: return 'Thinking...';
      }
  };

  if (isLoading) {
    return (
      <div className="flex-1 h-full bg-white flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <div className="relative w-32 h-32 mx-auto">
             <div className="absolute inset-0 border-[6px] border-stone-800 rounded-full animate-[spin_4s_linear_infinite]"></div>
             <div className="absolute inset-0 border-[6px] border-stone-800 rounded-full animate-[spin_3s_linear_infinite_reverse] scale-75 opacity-50"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">
                    {loadingStep === 'locating_objects' ? '🏷️' : '🎨'}
                </span>
             </div>
          </div>
          <div>
             <h2 className="text-2xl font-black text-stone-800 tracking-tight font-['Fredoka']">{getLoadingText()}</h2>
             <p className="text-stone-500 font-bold mt-2">Creating "{appState.topic}"</p>
          </div>
        </div>
      </div>
    );
  }

  // Show "Ready" if no content at all
  if (!content) {
    return (
      <div className="flex-1 h-full bg-stone-100 flex items-center justify-center p-8">
        <div className="max-w-md text-center border-[5px] border-dashed border-stone-300 rounded-[3rem] p-12 bg-white/50">
            <h2 className="text-4xl font-black text-stone-400 mb-2 font-['Fredoka']">Ready?</h2>
            <p className="text-stone-400 font-bold text-lg">Type a topic to start!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-stone-100 p-4 lg:p-6 overflow-y-auto flex items-center justify-center font-['Inter']">
      <div className="max-w-6xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-[5px] border-stone-900 flex flex-col h-[90vh] lg:h-auto relative">
        
        {/* Header */}
        <div className="bg-[#FFD966] p-4 lg:p-6 border-b-[5px] border-stone-900 flex justify-between items-center shrink-0">
            <h1 className="text-3xl lg:text-5xl font-black text-stone-900 tracking-tight uppercase font-['Fredoka']">{content.topic}</h1>
            <div className="text-xs font-bold text-stone-700 uppercase tracking-wider opacity-50">
                Preview Mode
            </div>
        </div>

        {/* Main Image Container */}
        <div className="relative flex-1 bg-stone-50 overflow-hidden flex items-center justify-center pointer-events-none select-none">
            <div className="relative w-full h-full flex items-center justify-center">
               {imageUrl ? (
                 <img 
                    src={imageUrl} 
                    alt={content.topic}
                    className="w-full h-full object-contain"
                 />
               ) : (
                 <div className="text-center p-8 opacity-50">
                    <ImageOff className="w-24 h-24 mx-auto mb-4 text-stone-400" />
                    <p className="text-xl font-bold text-stone-400">Image generation unavailable</p>
                 </div>
               )}

               {/* 
                  VISUAL STYLE: Speech Bubbles / Labels
                  Fallback layout if image is missing or coordinates not found
               */}
               <div className="absolute inset-0">
                  {content.vocabulary.map((vocab, index) => {
                    const hasCoords = vocab.coordinates && vocab.coordinates.x > 0;
                    
                    // Fallback Grid Calculation
                    // If no image/coords, we arrange them in a neat grid for visibility
                    const cols = 2;
                    const row = Math.floor(index / cols);
                    const col = index % cols;
                    
                    // Spread them out evenly if no coords
                    const fallbackLeft = 25 + (col * 50); 
                    const fallbackTop = 20 + (row * 20); // Stack vertically

                    const xPos = hasCoords ? vocab.coordinates!.x : fallbackLeft;
                    const yPos = hasCoords ? vocab.coordinates!.y : fallbackTop;

                    return (
                      <div 
                        key={index}
                        className="absolute flex flex-col items-center justify-center z-10 transition-all duration-500 ease-out"
                        style={{ 
                            left: `${xPos}%`, 
                            top: `${yPos}%`,
                            transform: 'translate(-50%, -50%)' 
                        }}
                      >
                         {/* THE TAG/LABEL DESIGN */}
                         <div className="
                            bg-white 
                            border-[2.5px] border-stone-900 
                            rounded-xl 
                            px-3 py-1.5 
                            shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] 
                            flex flex-col items-center text-center 
                            min-w-[100px]
                         ">
                            <span className="text-lg font-black text-stone-900 leading-none font-['Fredoka'] tracking-wide">
                                {vocab.word}
                            </span>
                            
                            <div className="text-[10px] font-bold text-stone-500 font-mono my-0.5">
                                /{vocab.phonetic}/
                            </div>

                            <div className="text-base font-bold text-stone-800 leading-none font-['Fredoka']">
                                {vocab.translation}
                            </div>
                         </div>
                         
                         {/* Little "pointer" triangle only if we have an image to point to */}
                         {imageUrl && hasCoords && (
                             <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-stone-900 mt-[-2px] drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"></div>
                         )}
                      </div>
                    );
                  })}
               </div>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t-[5px] border-stone-900 flex justify-between items-center shrink-0 hidden lg:flex">
             <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Generated by Gemini 2.5 Flash
             </div>
             <div className="flex gap-3">
               <button className="py-2 px-5 rounded-lg border-[3px] border-stone-900 bg-white text-stone-900 text-sm font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2">
                  <Share2 className="w-4 h-4" /> Share
               </button>
               {imageUrl && (
                   <a 
                      href={imageUrl} 
                      download={`lingocard-${content.topic}.png`}
                      className="bg-[#FF6B6B] text-stone-900 px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border-[3px] border-stone-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                   >
                      <Download className="w-4 h-4" />
                      Save Image
                   </a>
               )}
             </div>
        </div>
      </div>
    </div>
  );
};