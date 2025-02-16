import React, { useState, useRef, TouchEvent } from 'react';

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
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Find the index of the currently selected style
  const selectedIndex = styles.findIndex(style => style.id === selectedStyle);

  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) < minSwipeDistance) {
      return;
    }

    if (distance > 0) {
      // Swiped left
      goToNext();
    } else {
      // Swiped right
      goToPrevious();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const goToNext = () => {
    const newIndex = Math.min(selectedIndex + 1, styles.length - 1);
    setCurrentIndex(Math.min(currentIndex + 1, styles.length - 3));
    onStyleSelect(styles[newIndex].id);
  };

  const goToPrevious = () => {
    const newIndex = Math.max(selectedIndex - 1, 0);
    setCurrentIndex(Math.max(currentIndex - 1, 0));
    onStyleSelect(styles[newIndex].id);
  };

  return (
    <div className="w-full max-w-2xl mt-4 mx-auto">
      <h2 className="text-lg font-bold mb-4 text-center text-n-1">Choose Caption Style</h2>
      <div className="relative flex items-center overflow-hidden" ref={containerRef}>
        <button
          onClick={goToPrevious}
          className="absolute left-0 z-10 bg-n-6 text-n-1 rounded-full p-2 hover:bg-n-5"
          disabled={selectedIndex === 0}
        >
          &lt;
        </button>
        <div 
          className="flex transition-transform duration-300 ease-in-out touch-pan-x"
          style={{ transform: `translateX(-${currentIndex * 33.33}%)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {styles.map((style, index) => (
            <div
              key={style.id}
              className={`flex-shrink-0 w-1/3 px-2 cursor-pointer rounded-lg overflow-hidden border-2 ${
                selectedStyle === style.id ? 'border-color-1' : 'border-transparent'
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
              <p className="text-center font-semibold mt-1 text-xs text-n-2">{style.name}</p>
            </div>
          ))}
        </div>
        <button
          onClick={goToNext}
          className="absolute right-0 z-10 bg-n-6 text-n-1 rounded-full p-2 hover:bg-n-5"
          disabled={selectedIndex === styles.length - 1}
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default CaptionStyleSelector;
