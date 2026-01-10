import { useRef, useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Keyboard } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { ShoeCard } from "./ShoeCard";

import "swiper/css";

interface RecommendedShoe {
  brand: string;
  fullName: string;
  model: string;
  version: string;
  matchReason: string;
  keyStrengths: string[];
  recommendationType: "close_match" | "close_match_2" | "trade_off_option";
  weight_feel_1to5: 1 | 2 | 3 | 4 | 5;
  heel_drop_mm: number;
  has_plate: boolean;
  plate_material: "Nylon" | "Plastic" | "Carbon" | null;
  tradeOffs?: string[];
  similar_to?: string;
  shoeId?: string;
}

interface ShoeCarouselProps {
  recommendations: RecommendedShoe[];
  role: "daily" | "tempo" | "race" | "easy" | "long" | "trail";
}

export function ShoeCarousel({ recommendations, role }: ShoeCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [collapseKey, setCollapseKey] = useState(0);
  const totalSlides = recommendations.length;

  // Disable loop if only 1 recommendation
  const enableLoop = totalSlides > 1;

  useEffect(() => {
    // Inject custom styles for slides
    const style = document.createElement("style");
    style.id = "swiper-custom-styles";
    style.textContent = `
      .shoe-carousel .swiper-slide {
        transition: transform 250ms ease-out, opacity 250ms ease-out;
        opacity: 0.6;
        transform: scale(0.95);
      }
      .shoe-carousel .swiper-slide-active {
        opacity: 1;
        transform: scale(1);
      }
    `;

    // Remove existing style if present
    const existingStyle = document.getElementById("swiper-custom-styles");
    if (existingStyle) {
      existingStyle.remove();
    }
    document.head.appendChild(style);

    return () => {
      const styleToRemove = document.getElementById("swiper-custom-styles");
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, []);

  const handleSlideChange = (swiper: SwiperType) => {
    setActiveIndex(swiper.realIndex);
    // Increment collapse key to trigger all cards to collapse
    setCollapseKey(prev => prev + 1);
  };

  if (totalSlides === 0) {
    return null;
  }

  // Single card - no carousel needed
  if (totalSlides === 1) {
    return (
      <div className="flex flex-col items-center py-2 px-4">
        <ShoeCard shoe={recommendations[0]} role={role} collapseKey={collapseKey} />
      </div>
    );
  }

  return (
    <div className="shoe-carousel w-full py-2">
      <Swiper
        modules={[Keyboard]}
        spaceBetween={16}
        slidesPerView={1.3}
        centeredSlides={true}
        loop={enableLoop}
        loopAdditionalSlides={2}
        keyboard={{ enabled: true }}
        grabCursor={true}
        breakpoints={{
          320: {
            slidesPerView: 1.15,
            spaceBetween: 12,
          },
          375: {
            slidesPerView: 1.2,
            spaceBetween: 16,
          },
          640: {
            slidesPerView: 1.4,
            spaceBetween: 20,
          },
          1024: {
            slidesPerView: 1.5,
            spaceBetween: 24,
          },
        }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={handleSlideChange}
        a11y={{
          prevSlideMessage: "Previous shoe recommendation",
          nextSlideMessage: "Next shoe recommendation",
        }}
        aria-label="Shoe recommendations carousel"
      >
        {recommendations.map((shoe, index) => (
          <SwiperSlide
            key={shoe.shoeId || `shoe-${index}`}
            aria-label={`Shoe ${index + 1} of ${totalSlides}: ${shoe.fullName}`}
          >
            <div className="flex justify-center">
              <ShoeCard shoe={shoe} role={role} collapseKey={collapseKey} />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default ShoeCarousel;
