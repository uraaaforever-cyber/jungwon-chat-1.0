
import React, { useState, useRef, useEffect } from 'react';
import { fileToBase64 } from '../utils/fileUtils';

interface SettingsToolbarProps {
  themeColor: string;
  setThemeColor: (color: string) => void;
  setUserAvatar: (base64: string | null) => void;
  userName: string;
  setUserName: (name: string) => void;
}

const SettingsToolbar: React.FC<SettingsToolbarProps> = ({
  themeColor,
  setThemeColor,
  setUserAvatar,
  userName,
  setUserName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Local state for the nickname input
  const [localName, setLocalName] = useState(userName);

  // Sync local name if prop changes externally
  useEffect(() => {
    setLocalName(userName);
  }, [userName]);
  
  // Cropper State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setCropImage(`data:${e.target.files[0].type};base64,${base64}`);
        setCropModalOpen(true);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      } catch (err) {
        console.error("Failed to load image", err);
      }
    }
    // Reset file input
    e.target.value = '';
  };

  // Draw image to canvas for preview/cropping
  useEffect(() => {
    if (!cropModalOpen || !cropImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load image
    imageRef.current.src = cropImage;
    imageRef.current.onload = () => {
      drawCanvas();
    };
  }, [cropModalOpen, cropImage]);

  useEffect(() => {
    if (cropModalOpen && cropImage) {
      drawCanvas();
    }
  }, [zoom, offset, cropModalOpen]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current.complete) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas size (fixed for preview)
    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);
    
    // Draw background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    // Center logic
    ctx.translate(cw / 2, ch / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(offset.x, offset.y);
    
    // Draw centered image
    const iw = imageRef.current.width;
    const ih = imageRef.current.height;
    
    ctx.drawImage(
      imageRef.current, 
      -iw / 2, 
      -ih / 2, 
      iw, 
      ih
    );
    
    ctx.restore();

    // Draw Overlay (Square mask for 1:1)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, cw, ch);

    // Clear center rect (viewport)
    const cropSize = 200;
    ctx.clearRect((cw - cropSize)/2, (ch - cropSize)/2, cropSize, cropSize);
    
    // Draw border around viewport
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect((cw - cropSize)/2, (ch - cropSize)/2, cropSize, cropSize);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.x) / zoom;
    const dy = (e.clientY - dragStart.y) / zoom;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleCropConfirm = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const offscreen = document.createElement('canvas');
    const cropSize = 200; // Visual crop size
    const outputSize = 400; // High quality output
    offscreen.width = outputSize;
    offscreen.height = outputSize;
    const ctx = offscreen.getContext('2d');
    
    if (!ctx) return;

    const cw = canvasRef.current.width;
    const ch = canvasRef.current.height;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, outputSize, outputSize);

    ctx.translate(outputSize / 2, outputSize / 2);
    
    const ratio = outputSize / cropSize; 
    ctx.scale(zoom * ratio, zoom * ratio);
    ctx.translate(offset.x, offset.y);

    const iw = imageRef.current.width;
    const ih = imageRef.current.height;
    
    ctx.drawImage(imageRef.current, -iw / 2, -ih / 2, iw, ih);

    const croppedBase64 = offscreen.toDataURL('image/png').split(',')[1];
    setUserAvatar(croppedBase64);

    setCropModalOpen(false);
    setCropImage(null);
  };

  const confirmName = () => {
      if (localName.trim()) {
          setUserName(localName.trim());
      } else {
          setUserName("Engene");
          setLocalName("Engene");
      }
  };

  return (
    <div className="absolute top-6 left-6 z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-full glass-panel hover:bg-white/10 transition-all duration-300 group"
        title="Customize Interface"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-200 drop-shadow-[0_0_5px_rgba(255,192,203,0.5)] group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Settings Menu */}
      {isOpen && (
        <div className="absolute top-14 left-0 w-72 glass-panel p-6 rounded-2xl animate-materialize flex flex-col gap-6 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          
          <h3 className="text-white/80 font-serif tracking-widest text-sm border-b border-white/10 pb-2">SETTINGS</h3>

          {/* Nickname Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Call Me</label>
            <div className="relative flex gap-2">
              <input 
                type="text" 
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                maxLength={10}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-pink-100 placeholder-white/20 focus:outline-none focus:border-pink-300/50 transition-colors"
                placeholder="Engene"
              />
              <button 
                onClick={confirmName}
                className="p-2 bg-white/10 hover:bg-pink-500/20 text-pink-200 rounded-lg transition-colors border border-white/10"
                title="Confirm Name"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                 </svg>
              </button>
            </div>
            <span className="text-[10px] text-white/30 text-right">
                {localName.length}/10
            </span>
          </div>

          {/* Color Picker */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Theme Glow</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-none overflow-hidden" 
              />
              <span className="text-xs text-white/50 font-mono">{themeColor}</span>
            </div>
          </div>

          {/* User Avatar Upload */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wide">My Avatar (1:1)</label>
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors border border-dashed border-white/20">
              <input type="file" onChange={handleAvatarSelect} className="hidden" accept="image/*" />
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <span className="text-xs text-white/70">Upload & Crop</span>
            </label>
          </div>

          <div className="text-[10px] text-white/20 text-center pt-2">
            Click gear to close
          </div>
        </div>
      )}

      {/* Cropper Modal */}
      {cropModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-materialize">
          <div className="bg-[#12122b] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col items-center">
            <h3 className="text-white font-serif mb-4 tracking-widest text-lg">CROP AVATAR</h3>
            
            <div 
              className="relative w-[300px] h-[300px] overflow-hidden rounded-lg bg-black cursor-move touch-none border border-white/5"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <canvas 
                ref={canvasRef} 
                width={300} 
                height={300} 
                className="w-full h-full"
              />
            </div>

            <div className="w-full mt-6 px-4">
              <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wide">Zoom</label>
              <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.1" 
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-pink-300 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex gap-4 mt-8 w-full">
              <button 
                onClick={() => { setCropModalOpen(false); setCropImage(null); }}
                className="flex-1 py-3 rounded-xl border border-white/20 text-white/60 hover:bg-white/5 transition-colors text-sm font-bold tracking-wide"
              >
                CANCEL
              </button>
              <button 
                onClick={handleCropConfirm}
                className="flex-1 py-3 rounded-xl bg-pink-300 text-black hover:bg-pink-200 transition-colors text-sm font-bold tracking-wide shadow-[0_0_15px_rgba(249,168,212,0.4)]"
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsToolbar;
