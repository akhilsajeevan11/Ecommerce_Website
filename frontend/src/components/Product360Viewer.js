import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

const Product360Viewer = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square bg-zinc-100 flex items-center justify-center">
        <p className="mono-font text-sm text-zinc-400">360° View Not Available</p>
      </div>
    );
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="w-full aspect-square bg-zinc-50 relative group" data-testid="product-360-viewer">
      <img
        src={images[currentIndex]}
        alt={`360 view ${currentIndex + 1}`}
        className="w-full h-full object-cover grayscale-image"
      />
      <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="outline"
          className="rounded-full bg-white/90 hover:bg-white"
          onClick={prevImage}
          data-testid="360-prev-btn"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="rounded-full bg-white/90 hover:bg-white"
          onClick={nextImage}
          data-testid="360-next-btn"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-black/50 text-white px-3 py-1 rounded-full">
          <span className="mono-font text-xs">{currentIndex + 1} / {images.length}</span>
        </div>
      </div>
    </div>
  );
};

export default Product360Viewer;
