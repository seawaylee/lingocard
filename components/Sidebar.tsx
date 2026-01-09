import React, { useState } from 'react';
import { AppState, DifficultyLevel, ModelType } from '../types';
import { Loader2, Volume2, Sparkles, BookOpen, Terminal, X, Copy, Check, Settings2, ChevronDown, ChevronUp, Zap, Brain } from 'lucide-react';
import { playTTS } from '../services/geminiService';

interface SidebarProps {
  appState: AppState;
  onGenerate: (topic: string, level: DifficultyLevel, wordCount: number, modelType: ModelType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ appState, onGenerate }) => {
  const [localTopic, setLocalTopic] = useState('');
  const [localLevel, setLocalLevel] = useState<DifficultyLevel>(DifficultyLevel.Preschool);
  const [localModel, setLocalModel] = useState<ModelType>('flash');
  const [wordCount, setWordCount] = useState<number>(10);
  const [showSettings, setShowSettings] = useState(false);
  
  const [playingItem, setPlayingItem] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localTopic.trim()) {
      onGenerate(localTopic, localLevel, wordCount, localModel);
    }
  };

  const handlePlayAudio = async (text: string, id: string) => {
      if (playingItem !== null) return;
      setPlayingItem(id);
      await playTTS(text);
      setPlayingItem(null);
  }

  const handleCopyPrompt = () => {
      if (appState.content?.fullPrompt) {
          navigator.clipboard.writeText(appState.content.fullPrompt);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  }

  const levels = Object.values(DifficultyLevel);

  return (
    <div className="w-full lg:w-[400px] xl:w-[450px] bg-white border-r-4 border-stone-200 h-full flex flex-col z-10 overflow-hidden font-['Inter'] relative">
      
      {/* Header / Input Section */}
      <div className="p-6 border-b-4 border-stone-100 bg-white z-20 shrink-0">
        <div className="flex items-center gap-2 mb-6">
           <div className="w-10 h-10 bg-yellow-400 rounded-lg border-2 border-stone-900 flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
               <BookOpen className="w-6 h-6 text-stone-900" />
           </div>
           <h1 className="text-2xl font-black text-stone-900 tracking-tight">LingoCard AI</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-black text-stone-400 uppercase tracking-wider mb-2 block ml-1">Topic</label>
            <input
              type="text"
              value={localTopic}
              onChange={(e) => setLocalTopic(e.target.value)}
              placeholder="e.g. Coffee Shop, Airport..."
              className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 text-stone-900 font-bold placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:bg-white transition-all shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={appState.isLoading || !localTopic.trim()}
            className="w-full bg-[#4ADE80] hover:bg-[#22c55e] text-stone-900 font-black py-4 rounded-xl border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(28,25,23,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
          >
            {appState.isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                GENERATE CARD
              </>
            )}
          </button>

          {/* Toggle Advanced Settings */}
          <div>
              <button 
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors mx-auto mt-2"
              >
                  {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showSettings ? 'Hide Settings' : 'Advanced Settings'}
              </button>
          </div>

          {/* Collapsible Settings Area */}
          {showSettings && (
             <div className="pt-2 space-y-5 animate-in slide-in-from-top-2 fade-in duration-200">
                
                {/* Model Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-wider ml-1">AI Model</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl border-2 border-stone-200">
                        <button
                            type="button"
                            onClick={() => setLocalModel('flash')}
                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                                localModel === 'flash' 
                                ? 'bg-white text-stone-900 shadow-sm border-2 border-stone-900' 
                                : 'text-stone-500 hover:text-stone-700'
                            }`}
                        >
                            <Zap className="w-4 h-4" />
                            Flash (Fast)
                        </button>
                        <button
                            type="button"
                            onClick={() => setLocalModel('pro')}
                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                                localModel === 'pro' 
                                ? 'bg-white text-stone-900 shadow-sm border-2 border-stone-900' 
                                : 'text-stone-500 hover:text-stone-700'
                            }`}
                        >
                            <Brain className="w-4 h-4" />
                            Pro (Best)
                        </button>
                    </div>
                </div>

                {/* Word Count */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-xs font-black text-stone-400 uppercase tracking-wider">Words</label>
                        <span className="text-xs font-bold text-stone-900 bg-stone-200 px-2 py-0.5 rounded-md">{wordCount}</span>
                    </div>
                    <input 
                        type="range" 
                        min="4" 
                        max="15" 
                        step="1"
                        value={wordCount}
                        onChange={(e) => setWordCount(parseInt(e.target.value))}
                        className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                    />
                </div>

                {/* Level Selection (Chips) */}
                <div className="space-y-2">
                     <label className="text-xs font-black text-stone-400 uppercase tracking-wider ml-1">Difficulty</label>
                     <div className="flex flex-wrap gap-2">
                         {levels.map(l => (
                             <button
                                key={l}
                                type="button"
                                onClick={() => setLocalLevel(l as DifficultyLevel)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                    localLevel === l
                                    ? 'bg-stone-800 border-stone-800 text-white shadow-md'
                                    : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'
                                }`}
                             >
                                 {l}
                             </button>
                         ))}
                     </div>
                </div>
             </div>
          )}
        </form>
      </div>

      {/* Content List Section - Word Cards Here */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white pb-16">
        {appState.content ? (
          <div className="p-6 space-y-8">
            
            {/* 1. Vocabulary Cards (Primary) */}
            <section>
              <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span> Vocabulary Cards ({appState.content.vocabulary.length})
              </h3>
              <div className="space-y-3">
                {appState.content.vocabulary.map((vocab, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 rounded-xl border-2 border-stone-200 hover:border-blue-400 hover:shadow-[2px_2px_0px_0px_rgba(59,130,246,1)] transition-all bg-white group cursor-pointer"
                    onClick={() => handlePlayAudio(vocab.word, `vocab-${idx}`)}
                  >
                    <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                            <h4 className="font-black text-lg text-stone-800 font-['Fredoka']">{vocab.word}</h4>
                            <span className="text-xs font-mono text-stone-400">{vocab.phonetic}</span>
                        </div>
                        <p className="text-sm font-bold text-stone-500">{vocab.translation}</p>
                    </div>
                    <button 
                        className="p-2 rounded-lg bg-stone-50 text-stone-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors"
                        disabled={playingItem === `vocab-${idx}`}
                    >
                        {playingItem === `vocab-${idx}` ? <Loader2 className="w-5 h-5 animate-spin"/> : <Volume2 className="w-5 h-5" />}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Sentences (Secondary) */}
            <section>
              <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-stone-300"></span> Sentences
              </h3>
              <div className="space-y-4">
                {appState.content.sentences.map((sent, idx) => (
                  <div key={idx} className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                    <p className="font-bold text-stone-800 mb-2 leading-relaxed">{sent.english}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                        <p className="text-sm font-medium text-stone-500">{sent.chinese}</p>
                        <button 
                            onClick={() => handlePlayAudio(sent.english, `sent-${idx}`)}
                            disabled={playingItem === `sent-${idx}`}
                            className="p-1.5 bg-white hover:bg-stone-200 rounded-full transition-colors text-stone-400 hover:text-stone-800"
                        >
                             {playingItem === `sent-${idx}` ? <Loader2 className="w-3 h-3 animate-spin"/> : <Volume2 className="w-3 h-3" />}
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-stone-300 p-8 text-center">
            <div className="w-20 h-20 border-4 border-stone-100 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-stone-200" />
            </div>
            <p className="text-sm font-bold">Vocabulary cards will appear here.</p>
          </div>
        )}
      </div>

        {/* Footer Prompt Button */}
        <div className="absolute bottom-0 left-0 w-full p-4 bg-white border-t-2 border-stone-100">
            {appState.content && (
                <button 
                    onClick={() => setShowPrompt(true)}
                    className="flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-stone-800 transition-colors"
                >
                    <Terminal className="w-4 h-4" />
                    Show AI Prompt
                </button>
            )}
        </div>

        {/* Prompt Modal */}
        {showPrompt && (
            <div className="absolute inset-0 bg-stone-900/90 z-50 p-6 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-h-full flex flex-col shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                        <h3 className="font-bold text-stone-800 flex items-center gap-2">
                            <Terminal className="w-4 h-4" /> Generation Prompt
                        </h3>
                        <div className="flex gap-2">
                             <button 
                                onClick={handleCopyPrompt}
                                className="p-2 hover:bg-stone-200 rounded-lg transition-colors text-stone-600"
                                title="Copy"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4"/>}
                            </button>
                            <button 
                                onClick={() => setShowPrompt(false)}
                                className="p-2 hover:bg-stone-200 rounded-lg transition-colors text-stone-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="p-4 overflow-y-auto bg-stone-900 text-stone-300 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                        {appState.content?.fullPrompt}
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};