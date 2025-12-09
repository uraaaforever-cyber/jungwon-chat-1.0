
import React, { useState, useRef, useEffect } from 'react';
import ParticleBackground from './components/ParticleBackground';
import ParticleShape from './components/ParticleShape';
import ChatMessage from './components/ChatMessage';
import InputArea from './components/InputArea';
import SettingsToolbar from './components/SettingsToolbar';
import { Message, MessageRole, Attachment, VisualEffectType } from './types';
import { sendMessageToGemini } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

// Default System Avatar (Jungwon)
const DEFAULT_SYSTEM_AVATAR = "https://i.pinimg.com/736x/87/03/49/8703493c061555627685605663737e5c.jpg";

// Initial welcome message
const INITIAL_MESSAGE: Message = {
  id: 'init-1',
  role: MessageRole.MODEL,
  text: "엔진~ 안녕... 오늘 좀 피곤하네.. 밥은 먹었어?",
  translation: "Engene~ 嗨…… 今天有点累呢…… 吃饭了吗？",
  showTranslation: true, 
  timestamp: Date.now(),
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false); // For API call status
  const [isTyping, setIsTyping] = useState(false); // For typing visual indicator
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // App Flow State
  const [hasEntered, setHasEntered] = useState(false);
  
  // Customization State
  const [themeColor, setThemeColor] = useState('#ffc0cb'); 
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [systemAvatar, setSystemAvatar] = useState<string>(DEFAULT_SYSTEM_AVATAR);
  const [userName, setUserName] = useState("Engene"); 
  
  // Global Visual Effect (Background)
  const [activeVisualEffect, setActiveVisualEffect] = useState<VisualEffectType | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    // 1. Add User Message
    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      role: MessageRole.USER,
      text,
      attachments,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setIsTyping(true);

    // 2. Prepare History for Context
    const history = messages; 

    // 3. Call Gemini with userName
    // Ensure we pass the current state userName
    const responseData = await sendMessageToGemini(history, text, attachments, userName);

    setIsLoading(false);

    // 4. Add AI Messages (Burst Effect with HUMAN Typing Delay)
    if (responseData.replies && responseData.replies.length > 0) {
      // Helper function to add messages with natural delay
      const addMessagesSequentially = async () => {
        // Initial "Reading" and "Thinking" delay before the first message
        // Humans take time to read, think, and then start typing.
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

        for (let i = 0; i < responseData.replies.length; i++) {
          const reply = responseData.replies[i];
          
          // Calculate delay: Realistic human typing speed
          // Average typing speed on phone ~ 150-200ms per character including pauses
          const typingTimePerChar = 150; 
          const baseThinkingTime = 1000; // Time between sending one bubble and starting the next
          
          // The delay represents the time it takes to "write" this specific message
          const typingDelay = baseThinkingTime + (reply.korean.length * typingTimePerChar);
          
          await new Promise(resolve => setTimeout(resolve, typingDelay)); 

          const aiMsg: Message = {
            id: (Date.now() + i).toString(),
            role: MessageRole.MODEL,
            text: reply.korean,
            translation: reply.chinese,
            showTranslation: true,
            timestamp: Date.now(),
          };
          
          setMessages(prev => [...prev, aiMsg]);
        }
        setIsTyping(false); // Stop typing indicator after last message
      };
      
      await addMessagesSequentially();
    } else {
        // Fallback
         setIsTyping(false);
         setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: MessageRole.MODEL,
            text: "...",
            translation: "...",
            showTranslation: true,
            timestamp: Date.now()
        }]);
    }

    // 5. Handle Visual Effect Trigger (Background)
    if (responseData.triggerEffect) {
        // Wait an additional 2 seconds after the last message for reading time
        const effectDelay = 2000;
        
        setTimeout(() => {
            setActiveVisualEffect(responseData.triggerEffect!);

            // Restore after 8 seconds (longer for better effects)
            setTimeout(() => {
                setActiveVisualEffect(null);
            }, 8000);

        }, effectDelay);
    }
  };

  const toggleTranslation = (id: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, showTranslation: !msg.showTranslation } : msg
    ));
  };

  // --- Loading Screen Logic ---
  const [entryName, setEntryName] = useState(""); // Initialize empty to show placeholder
  const sysFileInputRef = useRef<HTMLInputElement>(null);
  const userFileInputRef = useRef<HTMLInputElement>(null);

  const handleSystemAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        try {
            const base64 = await fileToBase64(e.target.files[0]);
            setSystemAvatar(`data:${e.target.files[0].type};base64,${base64}`);
        } catch (err) {
            console.error("Failed to upload avatar", err);
        }
    }
  };

  const handleUserAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        try {
            const base64 = await fileToBase64(e.target.files[0]);
            setUserAvatar(`data:${e.target.files[0].type};base64,${base64}`);
        } catch (err) {
            console.error("Failed to upload avatar", err);
        }
    }
  };

  const handleEnterApp = () => {
      const finalName = entryName.trim();
      
      if (finalName) {
          setUserName(finalName);
          // CRITICAL FIX: Rewrite the initial message to use the user's name immediately.
          // This prevents the AI from seeing "Engene" in the history and getting confused.
          setMessages(prev => prev.map(msg => {
            if (msg.id === 'init-1') {
                return {
                    ...msg,
                    text: msg.text.replace(/엔진/g, finalName),
                    translation: msg.translation?.replace(/Engene/g, finalName)
                };
            }
            return msg;
          }));
      } else {
          setUserName("Engene");
      }
      setHasEntered(true);
  };

  if (!hasEntered) {
      return (
          <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden font-sans bg-[#050511] text-pink-100">
               <ParticleBackground />
               <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent z-0"></div>
               
               <div className="z-10 flex flex-col items-center gap-12 animate-materialize w-full max-w-2xl px-4">
                   
                   <div className="text-center mb-4">
                        <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-200 to-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] mb-2">
                            AETHERIA
                        </h1>
                        <p className="text-pink-200/50 font-sans tracking-widest text-sm uppercase">Connection Established</p>
                   </div>

                   {/* Avatars Section */}
                   <div className="flex items-center justify-center gap-8 md:gap-16 w-full">
                       
                       {/* System Avatar */}
                       <div className="flex flex-col items-center gap-3">
                           <div className="relative group cursor-pointer" onClick={() => sysFileInputRef.current?.click()}>
                                <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-pink-200/30 shadow-[0_0_30px_rgba(255,192,203,0.3)] transition-transform duration-500 group-hover:scale-105">
                                        <img src={systemAvatar} alt="Jungwon" className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="text-xs font-bold tracking-widest uppercase">Upload</span>
                                </div>
                                <input type="file" ref={sysFileInputRef} className="hidden" accept="image/*" onChange={handleSystemAvatarUpload} />
                           </div>
                           <span className="text-xs tracking-widest text-pink-200/70 font-serif">JUNGWON</span>
                       </div>

                       {/* Connection Line */}
                       <div className="h-[1px] w-12 md:w-24 bg-gradient-to-r from-transparent via-pink-200/50 to-transparent"></div>

                       {/* User Avatar */}
                       <div className="flex flex-col items-center gap-3">
                           <div className="relative group cursor-pointer" onClick={() => userFileInputRef.current?.click()}>
                                <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-dashed border-pink-200/30 shadow-[0_0_15px_rgba(255,192,203,0.1)] transition-transform duration-500 group-hover:scale-105 bg-white/5 flex items-center justify-center">
                                        {userAvatar ? (
                                            <img src={userAvatar} alt="Me" className="w-full h-full object-cover" />
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 text-white/30">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                            </svg>
                                        )}
                                </div>
                                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="text-xs font-bold tracking-widest uppercase">Upload</span>
                                </div>
                                <input type="file" ref={userFileInputRef} className="hidden" accept="image/*" onChange={handleUserAvatarUpload} />
                           </div>
                           <span className="text-xs tracking-widest text-pink-200/70 font-serif">ME</span>
                       </div>
                   </div>

                   {/* Name Input */}
                   <div className="flex flex-col items-center gap-4 mt-4 w-full max-w-xs">
                       <input 
                            type="text" 
                            value={entryName} 
                            onChange={(e) => setEntryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleEnterApp()}
                            className="w-full bg-white/5 border-b border-white/20 px-4 py-3 text-center text-xl text-pink-100 placeholder-white/10 outline-none focus:border-pink-300 transition-all font-serif"
                            placeholder="Enter your name..."
                       />
                       <button 
                            onClick={handleEnterApp}
                            className="mt-4 px-12 py-3 rounded-full bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-200 font-bold tracking-widest uppercase transition-all duration-500 hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:scale-105"
                       >
                           Connect
                       </button>
                   </div>
               </div>
          </div>
      );
  }

  return (
    <div className="relative w-full h-screen flex flex-col overflow-hidden font-sans">
      {/* 1. Background Layers */}
      <ParticleBackground />
      {activeVisualEffect && <ParticleShape type={activeVisualEffect} />}
      
      {/* 2. Gradient Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-aether-dark/90 via-aether-dark/50 to-aether-dark/90 pointer-events-none z-0"></div>

      {/* 3. Settings Toolbar */}
      <SettingsToolbar 
        themeColor={themeColor} 
        setThemeColor={setThemeColor}
        setUserAvatar={setUserAvatar}
        userName={userName}
        setUserName={setUserName}
      />

      {/* 4. Header with Typing Indicator - REFACTORED for Boundary Issue */}
      <header className="absolute top-0 w-full z-40 p-4 flex flex-col items-center border-b border-white/5 bg-[#050511]/80 backdrop-blur-xl transition-all duration-500 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center pointer-events-auto">
          <div className="flex items-center gap-3 pt-2">
            <h1 className="text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-pink-200 tracking-[0.3em] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                JUNGWON
            </h1>
            {/* Header Typing Indicator - Positioned Next to Name */}
            {isTyping && (
                <div className="flex items-center gap-1 animate-fade-in ml-2">
                     <span className="w-1 h-1 bg-pink-200 rounded-full animate-pulse"></span>
                     <span className="w-1 h-1 bg-pink-200 rounded-full animate-pulse delay-100"></span>
                     <span className="w-1 h-1 bg-pink-200 rounded-full animate-pulse delay-200"></span>
                </div>
            )}
          </div>
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-pink-200/50 to-transparent mt-3"></div>
        </div>
      </header>

      {/* 5. Chat Area (Scrollable) */}
      <main className="flex-1 overflow-y-auto z-10 pt-28 px-4 pb-4 md:px-20 lg:px-60 scroll-smooth">
        <div className="max-w-4xl mx-auto flex flex-col">
          {messages.map((msg) => (
            <ChatMessage 
              key={msg.id} 
              message={msg} 
              themeColor={themeColor}
              customAvatar={msg.role === MessageRole.USER ? userAvatar : systemAvatar} 
              onToggleTranslation={() => toggleTranslation(msg.id)}
            />
          ))}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 6. Input Area (Fixed Bottom) */}
      <footer className="w-full z-20 pb-4 pt-4 bg-gradient-to-t from-aether-dark via-aether-dark/80 to-transparent">
        <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
      </footer>
    </div>
  );
};

export default App;
