import React, { useState, useRef, useEffect } from 'react';

interface CaptionStyle {
  id: string;
  name: string;
  videoSrc: string;
}

interface CaptionStyleSelectorProps {
  styles: CaptionStyle[];
  selectedStyle: string;
  onStyleSelect: (styleId: string) => void;
}

const CaptionStyleSelector: React.FC<CaptionStyleSelectorProps> = ({ styles, selectedStyle, onStyleSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const goToNext = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const videoWidth = containerWidth / 3;
      const maxIndex = Math.max(0, styles.length - Math.floor(containerWidth / videoWidth));
      setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, maxIndex));
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  return (
    <div className="w-full max-w-2xl mt-4">
      <h2 className="text-lg font-bold mb-4">Choose Caption Style</h2>
      <div className="relative flex items-center overflow-hidden" ref={containerRef}>
        <button
          onClick={goToPrevious}
          className="absolute left-0 z-10 bg-gray-800 text-white rounded-full p-2"
          disabled={currentIndex === 0}
        >
          &lt;
        </button>
        <div 
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 33.33}%)` }}
        >
          {styles.map((style, index) => (
            <div
              key={style.id}
              className={`flex-shrink-0 w-1/3 px-2 cursor-pointer rounded-lg overflow-hidden border-2 ${
                selectedStyle === style.id ? 'border-blue-500' : 'border-transparent'
              }`}
              onClick={() => onStyleSelect(style.id)}
            >
              <video
                ref={(el) => { videoRefs.current[index] = el; }}
                src={style.videoSrc}
                className="w-full h-auto"
                loop
                muted
                playsInline
                autoPlay
              />
              <p className="text-center font-semibold mt-1 text-xs">{style.name}</p>
            </div>
          ))}
        </div>
        <button
          onClick={goToNext}
          className="absolute right-0 z-10 bg-gray-800 text-white rounded-full p-2"
          disabled={currentIndex >= styles.length - 3}
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default CaptionStyleSelector;
