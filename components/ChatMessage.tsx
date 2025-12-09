
import React, { useEffect, useState } from 'react';
import { Message, MessageRole } from '../types';

interface ChatMessageProps {
  message: Message;
  themeColor: string;
  customAvatar: string | null;
  onToggleTranslation?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, themeColor, customAvatar, onToggleTranslation }) => {
  const isUser = message.role === MessageRole.USER;
  
  // "Materialize" effect state for bubble entry
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'} relative group min-h-[60px]`}>
      {/* Avatar (Left side - Model) */}
      {!isUser && (
        <div 
          className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 
            overflow-hidden transition-all duration-1000 transform ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
          style={{
            boxShadow: `0 0 15px ${themeColor}60`, 
            backgroundColor: `${themeColor}20`,
            border: `1px solid ${themeColor}80`
          }}
        >
          {customAvatar ? (
            <img src={customAvatar.startsWith('data:') || customAvatar.startsWith('http') ? customAvatar : `data:image/png;base64,${customAvatar}`} alt="AI" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-serif font-bold text-lg select-none" style={{ color: themeColor }}>J</span>
          )}
        </div>
      )}

      {/* Message Bubble Container */}
      <div 
        className={`relative max-w-[80%] md:max-w-[60%] flex flex-col items-start transition-all duration-700
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      >
        <div className="w-full">
            <div 
            className={`relative px-6 py-4 rounded-2xl backdrop-blur-md text-gray-100 shadow-lg overflow-hidden w-full`}
            style={{
                backgroundColor: isUser ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.2)',
                border: `1px solid ${isUser ? 'rgba(255,255,255,0.1)' : `${themeColor}40`}`,
                boxShadow: !isUser ? `inset 0 0 20px ${themeColor}10` : 'none',
            }}
            >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_4s_infinite]" />

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                {message.attachments.map((att, idx) => (
                    <div key={idx} className="relative group/att rounded-lg overflow-hidden border border-white/10">
                    {att.mimeType.startsWith('image/') ? (
                        <img 
                        src={`data:${att.mimeType};base64,${att.data}`} 
                        alt="attachment" 
                        className="max-w-[200px] max-h-[200px] object-cover hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="p-4 bg-white/5 flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wider text-pink-200">FILE</span>
                            <span className="text-sm truncate max-w-[150px]">{att.mimeType}</span>
                        </div>
                    )}
                    </div>
                ))}
                </div>
            )}

            {/* Text Content */}
            <div className="relative z-10 font-sans tracking-wide leading-relaxed whitespace-pre-wrap text-white/90">
                {message.text}
            </div>
            
            {/* Timestamp */}
            <div className="mt-2 text-[10px] text-white/20 text-right uppercase tracking-widest font-serif">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            </div>

            {/* Translation (Model Only) */}
            {!isUser && message.translation && (
            <div className="mt-2 w-full transition-all duration-500">
                {!message.showTranslation ? (
                <button 
                    onClick={onToggleTranslation}
                    className="flex items-center gap-2 text-xs font-serif tracking-widest uppercase py-1 px-3 rounded-full transition-all duration-300 hover:bg-white/5 opacity-60 hover:opacity-100"
                    style={{ color: `${themeColor}`, border: `1px solid ${themeColor}30` }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                    Show Translation
                </button>
                ) : (
                <div 
                    className="animate-materialize origin-top"
                    style={{ animationDuration: '0.4s' }}
                >
                    <div 
                    className="bg-black/30 backdrop-blur-sm p-4 rounded-xl border border-white/5 text-gray-300 text-sm leading-relaxed relative group/trans"
                    >
                    <div className="absolute -top-1 left-4 w-2 h-2 bg-black/30 border-t border-l border-white/5 transform rotate-45"></div>
                    {message.translation}
                    <button 
                        onClick={onToggleTranslation}
                        className="absolute top-2 right-2 text-[10px] uppercase opacity-30 hover:opacity-100 transition-opacity p-1"
                        title="Hide Translation"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                        </svg>
                    </button>
                    </div>
                </div>
                )}
            </div>
            )}
        </div>
      </div>

       {/* User Avatar (Right side) - Always visible */}
       {isUser && (
        <div className="relative ml-4">
             <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center 
                    overflow-hidden z-10 relative
                    transition-all duration-1000 transform ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
                style={{
                    border: '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: 'rgba(255,255,255,0.05)'
                }}
                >
                {customAvatar ? (
                    <img src={customAvatar.startsWith('data:') || customAvatar.startsWith('http') ? customAvatar : `data:image/png;base64,${customAvatar}`} alt="User" className="w-full h-full object-cover" />
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-200" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
