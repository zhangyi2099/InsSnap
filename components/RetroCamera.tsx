import React, { useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, Palette } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { Polaroid } from './Polaroid';
import { PhotoData, FilterType } from '../types';

interface RetroCameraProps {
  onTakePaper: (photo: PhotoData, rect: DOMRect) => void;
}

export const RetroCamera: React.FC<RetroCameraProps> = ({ onTakePaper }) => {
  const { videoRef, error, isLoading } = useCamera();
  const [flashActive, setFlashActive] = useState(false);
  const [ejectingPhoto, setEjectingPhoto] = useState<PhotoData | null>(null);
  const [isEjected, setIsEjected] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('normal');
  const photoRef = useRef<HTMLDivElement>(null);

  // CSS Strings for viewfinder preview
  const filterStyles: Record<FilterType, string> = {
    normal: 'none',
    bw: 'grayscale(1) contrast(1.2)',
    sepia: 'sepia(0.8) contrast(0.9) brightness(0.9)',
    warm: 'sepia(0.3) saturate(1.4) contrast(1.1) hue-rotate(-10deg)',
    cool: 'saturate(0.9) contrast(1.1) hue-rotate(15deg) brightness(1.1)'
  };

  const handleShoot = useCallback(() => {
    if (!videoRef.current || isLoading || ejectingPhoto) return;

    // 1. Flash Effect
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);

    // 2. Capture Image
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    
    // Calculate cropping to get a center square from the video feed
    const videoSize = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - videoSize) / 2;
    const startY = (video.videoHeight - videoSize) / 2;
    
    // Optimization: Limit output resolution for storage efficiency
    // 500px is sufficient for the polaroid display size (~220px) and retina screens
    // This keeps base64 strings manageable for localStorage
    const outputSize = 500;
    
    canvas.width = outputSize;
    canvas.height = outputSize;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror transform for selfie mode feel
      ctx.translate(outputSize, 0);
      ctx.scale(-1, 1);
      
      // Draw crop and resize in one step
      ctx.drawImage(video, startX, startY, videoSize, videoSize, 0, 0, outputSize, outputSize);
      
      // Note: We do NOT bake the filter into the image data (canvas). 
      // We save the raw image and apply the filter via CSS in the Polaroid component.
      // This allows the "developing" animation to work correctly on the raw pixels.
      const photoUrl = canvas.toDataURL('image/jpeg', 0.85);

      // 3. Start Ejection Animation
      const newPhoto: PhotoData = {
        id: Date.now().toString(),
        url: photoUrl,
        timestamp: Date.now(),
        x: 0,
        y: 0,
        rotation: (Math.random() * 4) - 2,
        isDeveloping: true,
        filterType: selectedFilter, // Save the selected filter
      };

      setEjectingPhoto(newPhoto);
      setIsEjected(false);

      // Animation timing
      setTimeout(() => {
        setIsEjected(true);
      }, 1000); // Fully ejected after 1s
    }
  }, [videoRef, isLoading, ejectingPhoto, selectedFilter]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isEjected || !ejectingPhoto || !photoRef.current) return;

    const rect = photoRef.current.getBoundingClientRect();
    onTakePaper(ejectingPhoto, rect);
    
    setEjectingPhoto(null);
    setIsEjected(false);
  };

  return (
    <div 
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 md:left-8 md:translate-x-0 md:bottom-8 z-40 flex flex-col items-center touch-manipulation"
      data-html2canvas-ignore="true"
    >
      {/* Ejecting Photo Slot Area */}
      <div className="absolute top-0 w-64 h-16 overflow-visible flex justify-center pointer-events-none" style={{ transform: 'translateY(-100%)' }}>
          {ejectingPhoto && (
             <div 
                ref={photoRef}
                className={`transition-all duration-1000 ease-out pointer-events-auto ${isEjected ? 'translate-y-[-60px]' : 'translate-y-[100%]'}`}
             >
               <Polaroid 
                 url={ejectingPhoto.url} 
                 timestamp={ejectingPhoto.timestamp}
                 isDeveloping={true}
                 filterType={ejectingPhoto.filterType}
                 style={{ transform: `scale(0.85) rotate(${ejectingPhoto.rotation}deg)` }}
                 isDraggable={isEjected}
                 onMouseDown={handleDragStart}
               />
             </div>
          )}
      </div>

      {/* Camera Body */}
      <div className="relative w-72 bg-[#fdf6e3] rounded-3xl shadow-2xl border-b-8 border-r-8 border-[#e6dac3] z-20 flex flex-col overflow-hidden">
        
        {/* Rainbow Stripe */}
        <div className="absolute top-8 left-0 w-full h-4 flex z-30 opacity-90">
            <div className="h-full w-1/6 bg-[#ff3b30]"></div>
            <div className="h-full w-1/6 bg-[#ff9500]"></div>
            <div className="h-full w-1/6 bg-[#ffcc00]"></div>
            <div className="h-full w-1/6 bg-[#4cd964]"></div>
            <div className="h-full w-1/6 bg-[#5ac8fa]"></div>
            <div className="h-full w-1/6 bg-[#007aff]"></div>
        </div>

        {/* Top Face / Ejection Slot */}
        <div className="h-12 bg-[#eee8d5] border-b border-[#d3cbb8] w-full flex items-center justify-center">
            <div className="w-48 h-1 bg-black/20 rounded-full"></div>
        </div>

        {/* Main Face */}
        <div className="p-6 pt-8 flex flex-col items-center gap-4 bg-[#fdf6e3]">
          
          {/* Lens / Viewfinder Area */}
          <div className="relative w-48 h-48 bg-black rounded-full border-8 border-[#333] shadow-inner overflow-hidden ring-4 ring-gray-300">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-white/50">
                <RefreshCw className="animate-spin w-8 h-8" />
              </div>
            )}
            {error && (
               <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 p-4 text-center text-xs text-red-200">
                 {error}
               </div>
            )}
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover transform scale-x-[-1] transition-all duration-300"
              style={{ filter: filterStyles[selectedFilter] }} 
            />
            
            {/* Flash Overlay */}
            <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-300 ${flashActive ? 'opacity-100' : 'opacity-0'}`}></div>

            {/* Lens Glare */}
            <div className="absolute top-4 right-8 w-8 h-4 bg-white/20 rounded-full rotate-[-30deg] blur-sm pointer-events-none"></div>
          </div>

          {/* Controls Area */}
          <div className="w-full mt-1 flex flex-col gap-3">
            
            {/* Filter Toggles */}
            <div className="flex justify-center items-center gap-2 px-2 py-1 bg-[#eee8d5] rounded-full border border-[#d3cbb8] shadow-inner mx-auto">
              {(['normal', 'bw', 'sepia', 'warm', 'cool'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  title={f.charAt(0).toUpperCase() + f.slice(1)}
                  className={`
                    w-6 h-6 rounded-full border-2 transition-all duration-200
                    ${selectedFilter === f ? 'scale-110 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'border-gray-400 hover:border-gray-600'}
                  `}
                  style={{
                    background: f === 'normal' ? '#ddd' 
                      : f === 'bw' ? '#333' 
                      : f === 'sepia' ? '#a67c52' 
                      : f === 'warm' ? '#e6b422' 
                      : '#89cff0'
                  }}
                />
              ))}
              <Palette className="w-3 h-3 text-gray-500 ml-1" />
            </div>

            {/* Shutter Row */}
            <div className="flex items-center justify-between w-full px-4">
              {/* Flash Indicator */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Ready</span>
              </div>

              {/* Shutter Button */}
              <button 
                onClick={handleShoot}
                disabled={!!ejectingPhoto}
                className={`
                  w-16 h-16 rounded-full border-4 border-[#d3cbb8] shadow-[0_4px_0_#b8b09c]
                  flex items-center justify-center active:shadow-none active:translate-y-1 transition-all
                  ${ejectingPhoto ? 'bg-gray-200 cursor-not-allowed' : 'bg-[#ff3b30] hover:bg-[#ff4f44]'}
                `}
              >
                <Camera className="text-white/90 w-8 h-8" strokeWidth={2.5} />
              </button>

              {/* Viewfinder / Sensor */}
              <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg border-2 border-gray-500 shadow-inner relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-blue-900/30"></div>
              </div>
            </div>
          </div>

        </div>
        
        {/* Bottom Branding */}
        <div className="pb-4 text-center">
            <h1 className="font-['Shadows_Into_Light'] text-2xl text-gray-400 tracking-widest font-bold transform -rotate-1">RetroSnap</h1>
        </div>
      </div>
    </div>
  );
};