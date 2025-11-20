import React, { useState, useEffect, useMemo } from 'react';
import { FilterType } from '../types';
import { X } from 'lucide-react';

interface PolaroidProps {
  url: string;
  timestamp: number;
  filterType?: FilterType;
  rotation?: number;
  isDeveloping?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onMouseDown?: (e: React.MouseEvent | React.TouchEvent) => void;
  isDraggable?: boolean;
  onDelete?: () => void;
}

export const Polaroid: React.FC<PolaroidProps> = ({
  url,
  timestamp,
  filterType = 'normal',
  rotation = 0,
  isDeveloping = false,
  className = '',
  style = {},
  onMouseDown,
  isDraggable = false,
  onDelete
}) => {
  const [developState, setDevelopState] = useState(isDeveloping ? 0 : 100);

  // Simulate developing process
  useEffect(() => {
    if (isDeveloping && developState < 100) {
      const timer = setTimeout(() => {
        setDevelopState(prev => Math.min(prev + 1, 100));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isDeveloping, developState]);

  // Compute the final CSS filter string based on state and filter type
  const imageFilterStyle = useMemo(() => {
    // Base developing parameters (0 to 100)
    // Developing always starts blurry and dark
    const progress = developState / 100;
    
    const baseBlur = Math.max(0, 10 - (developState / 10));
    const baseBrightness = 50 + (developState / 2); // 50% -> 100% (unless modified by filter)
    
    // Filter definitions (target values when fully developed)
    let targetGrayscale = 0;
    let targetSepia = 0;
    let targetContrast = 100;
    let targetSaturate = 100;
    let targetHue = 0;
    let brightnessMod = 0; // Additive brightness

    switch (filterType) {
      case 'bw':
        targetGrayscale = 100;
        targetContrast = 120;
        break;
      case 'sepia':
        targetSepia = 80;
        targetContrast = 90;
        brightnessMod = -5;
        break;
      case 'warm':
        targetSepia = 30;
        targetSaturate = 140;
        targetContrast = 110;
        targetHue = -10;
        break;
      case 'cool':
        targetSaturate = 90;
        targetContrast = 110;
        targetHue = 15;
        brightnessMod = 5;
        break;
      case 'normal':
      default:
        targetContrast = 105;
        break;
    }

    // Interpolate values based on developing progress
    // Initially (progress 0): High Grayscale (100), Low Contrast, Low Saturation is handled by darkening
    
    // Current values calculation:
    // Grayscale: Starts at 100 (undeveloped film), goes to targetGrayscale
    const currentGrayscale = 100 - (progress * (100 - targetGrayscale));
    
    // Sepia: Starts at 0, goes to targetSepia
    const currentSepia = progress * targetSepia;
    
    // Contrast: Starts low (50?), goes to targetContrast
    const currentContrast = 50 + (progress * (targetContrast - 50));
    
    // Saturate: Starts at 0, goes to targetSaturate
    const currentSaturate = progress * targetSaturate;

    // Hue: Starts 0, goes to target
    const currentHue = progress * targetHue;

    // Brightness: base logic + modifier fully applied at end
    const currentBrightness = baseBrightness + (progress * brightnessMod);

    return `
      blur(${baseBlur}px) 
      brightness(${currentBrightness}%) 
      contrast(${currentContrast}%) 
      grayscale(${currentGrayscale}%) 
      sepia(${currentSepia}%) 
      saturate(${currentSaturate}%)
      hue-rotate(${currentHue}deg)
    `;
  }, [developState, filterType]);

  return (
    <div
      onMouseDown={isDraggable ? (e) => onMouseDown?.(e) : undefined}
      onTouchStart={isDraggable ? (e) => onMouseDown?.(e) : undefined}
      className={`
        relative bg-white shadow-xl select-none group
        transform transition-transform duration-75 ease-out
        w-[170px] p-2 pb-8
        md:w-[220px] md:p-3 md:pb-12
        ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}
        ${className}
      `}
      style={{
        transform: `rotate(${rotation}deg)`,
        boxShadow: '2px 8px 20px rgba(0,0,0,0.25)',
        ...style
      }}
    >
      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          className="absolute -top-2 -right-2 z-50 bg-red-500 text-white rounded-full p-1.5 shadow-md 
                     opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 transform hover:scale-110"
          title="Delete photo"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      )}

      {/* The Photo Area */}
      <div className="relative w-full aspect-square bg-[#1a1a1a] overflow-hidden border border-gray-100">
        <img
          src={url}
          alt="Polaroid"
          className="w-full h-full object-cover block"
          draggable={false}
          style={{
            filter: imageFilterStyle,
            transition: 'filter 0.1s linear',
            // Ensure hardware acceleration for smooth filter transitions
            transform: 'translateZ(0)'
          }}
        />
        
        {/* Overlay textures for extra retro feel */}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay" 
             style={{ 
               backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
             }}>
        </div>

        {/* Glossy Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50 pointer-events-none"></div>
      </div>

      {/* Handwriting Caption Area */}
      <div className="absolute bottom-2 left-0 w-full text-center">
        <span className="text-gray-600 font-['Indie_Flower'] opacity-80 transform -rotate-1 inline-block text-sm md:text-lg">
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};