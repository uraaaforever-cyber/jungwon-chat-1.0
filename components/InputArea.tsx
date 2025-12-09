import React, { useState, useRef, useEffect } from 'react';
import { Attachment } from '../types';
import { fileToBase64, blobToBase64 } from '../utils/fileUtils';

interface InputAreaProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-expand
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: Attachment[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        try {
          const base64 = await fileToBase64(file);
          newAttachments.push({
            mimeType: file.type,
            data: base64,
            name: file.name
          });
        } catch (err) {
          console.error("File read error", err);
        }
      }
      setAttachments(prev => [...prev, ...newAttachments]);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' }); 
        const base64 = await blobToBase64(audioBlob);
        const audioAttachment: Attachment = {
            mimeType: 'audio/mp3', 
            data: base64,
            name: 'Voice Memo'
        };
        if (MediaRecorder.isTypeSupported('audio/webm')) {
            audioAttachment.mimeType = 'audio/webm';
        }

        setAttachments(prev => [...prev, audioAttachment]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied or error", err);
      alert("Microphone access is needed to record audio.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return;
    
    // We allow sending even if loading, handled by App queue or just concurrent
    onSendMessage(text, attachments);
    setText('');
    setAttachments([]);
    const textarea = document.querySelector('textarea');
    if (textarea) textarea.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const iconStyleClass = "text-pink-200 drop-shadow-[0_0_8px_rgba(255,183,178,0.6)] transition-all duration-300 hover:text-white hover:drop-shadow-[0_0_12px_rgba(255,183,178,0.9)]";

  return (
    <div className="w-full max-w-4xl mx-auto p-4 z-50">
      
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 glass-panel rounded-xl animate-materialize border border-pink-200/20">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative group bg-black/40 rounded-lg p-2 flex items-center gap-2 border border-pink-200/20">
              {att.mimeType.startsWith('image/') ? (
                <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="h-10 w-10 object-cover rounded" />
              ) : (
                <div className="h-10 w-10 flex items-center justify-center text-pink-200">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
              )}
              <span className="text-xs text-gray-300 max-w-[100px] truncate">{att.name || att.mimeType}</span>
              <button 
                onClick={() => removeAttachment(idx)}
                className="ml-1 text-red-400 hover:text-red-300 rounded-full p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className={`relative flex items-end gap-2 p-1.5 rounded-3xl glass-panel transition-all duration-300 opacity-100 focus-within:ring-1 focus-within:ring-pink-200/30 focus-within:shadow-[0_0_20px_rgba(255,183,178,0.1)]`}>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          className="hidden" 
          multiple
          accept="image/*, audio/*, application/pdf, text/plain"
        />

        <button 
          onClick={() => fileInputRef.current?.click()}
          className={`p-3 rounded-full hover:bg-white/5 ${iconStyleClass}`}
          title="Add File or Image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <textarea
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your dreams here..."
          rows={1}
          className="flex-1 bg-transparent text-white placeholder-pink-100/30 outline-none border-none resize-none py-3 px-2 max-h-[150px] font-sans tracking-wide"
        />

        <button 
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-3 rounded-full transition-all duration-300 hover:bg-white/5 ${isRecording ? 'text-red-400 bg-red-500/10 animate-pulse drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]' : iconStyleClass}`}
          title="Record Voice"
        >
           {isRecording ? (
             <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
           ) : (
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
           )}
        </button>

        <button 
          onClick={handleSend}
          disabled={!text.trim() && attachments.length === 0}
          className={`p-3 rounded-full transition-all duration-500 transform
            ${(!text.trim() && attachments.length === 0) ? 'text-gray-500 scale-90 opacity-50' : 'text-pink-200 bg-white/10 shadow-[0_0_15px_rgba(255,183,178,0.3)] hover:shadow-[0_0_20px_rgba(255,183,178,0.6)] scale-100 hover:scale-110'}
          `}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
      
      <div className="text-center mt-2 text-[10px] text-pink-200/20 uppercase tracking-widest">
        AI-generated content • Gemini 2.5 Flash
      </div>
    </div>
  );
};

export default InputArea;