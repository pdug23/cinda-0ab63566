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
  matchReason: string[];
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
  const totalSlides = recommendations.length;

  // Reorder cards: [2nd best, 1st best (center), 3rd best]
  // This puts the best match in the center position for visual emphasis
  const reorderedRecommendations = (() => {
    if (recommendations.length <= 1) return recommendations;
    if (recommendations.length === 2) return recommendations; // Keep as-is for 2 cards
    
    // For 3+ cards: [1st, 2nd, 3rd] → [2nd, 1st, 3rd]
    const [first, second, ...rest] = recommendations;
    return [second, first, ...rest];
  })();

  // Track which card is the "best match" (original position 0, now at index 1)
  const bestMatchIndex = recommendations.length >= 3 ? 1 : 0;

  useEffect(() => {
    // Inject custom styles for slides
    const style = document.createElement("style");
    style.id = "swiper-custom-styles";
    style.textContent = `
      .shoe-carousel .swiper {
        overflow: visible !important;
      }
      .shoe-carousel .swiper-wrapper {
        overflow: visible !important;
      }
      .shoe-carousel .swiper-slide {
        overflow: visible !important;
        transition: transform 250ms ease-out, opacity 250ms ease-out;
        opacity: 0.6;
        transform: scale(0.92);
      }
      .shoe-carousel .swiper-slide-active {
        opacity: 1;
        transform: scale(1);
      }
      /* Center emphasis for best match card on desktop */
      @media (min-width: 1024px) {
        .shoe-carousel .swiper-slide.best-match-slide {
          transform: scale(0.98);
        }
        .shoe-carousel .swiper-slide-active.best-match-slide {
          transform: scale(1.05);
        }
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
    setActiveIndex(swiper.activeIndex);
  };

  if (totalSlides === 0) {
    return null;
  }

  // Single card - no carousel needed
  if (totalSlides === 1) {
    return (
      <div className="flex flex-col items-center py-2 px-4">
        <ShoeCard shoe={recommendations[0]} role={role} position={1} />
      </div>
    );
  }

  // Map reordered index to position for styling (1=best, 2=second, 3=third)
  const getPosition = (reorderedIndex: number): 1 | 2 | 3 => {
    if (recommendations.length < 3) return (reorderedIndex + 1) as 1 | 2 | 3;
    // After reorder: [2nd, 1st, 3rd] - so index 1 is best (position 1)
    if (reorderedIndex === 1) return 1; // Best match (center)
    if (reorderedIndex === 0) return 2; // Second best (left)
    return 3; // Third best or trade-off (right)
  };

  return (
    <div className="shoe-carousel w-full py-6">
      <Swiper
        modules={[Keyboard]}
        spaceBetween={32}
        slidesPerView={1.2}
        centeredSlides={true}
        initialSlide={bestMatchIndex} // Start centered on best match
        loop={false}
        watchSlidesProgress={true}
        keyboard={{ enabled: true }}
        grabCursor={true}
        breakpoints={{
          320: {
            slidesPerView: 1.1,
            spaceBetween: 24,
          },
          375: {
            slidesPerView: 1.15,
            spaceBetween: 32,
          },
          640: {
            slidesPerView: 1.25,
            spaceBetween: 40,
          },
          1024: {
            slidesPerView: 1.35,
            spaceBetween: 48,
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
        {reorderedRecommendations.map((shoe, index) => {
          const isBestMatch = index === bestMatchIndex;
          const position = getPosition(index);
          
          return (
            <SwiperSlide
              key={`${shoe.shoeId || shoe.fullName}-${index}`}
              className={isBestMatch ? "best-match-slide" : ""}
              aria-label={`Shoe ${position} of ${totalSlides}: ${shoe.fullName}${isBestMatch ? " - Best Match" : ""}`}
            >
              <div className="flex justify-center">
                <ShoeCard shoe={shoe} role={role} position={position} />
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}

export default ShoeCarousel;
