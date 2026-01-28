import { useRef, useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Keyboard } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { ShoeCard } from "./ShoeCard";
import { cn } from "@/lib/utils";

import "swiper/css";

interface RecommendedShoe {
  brand: string;
  fullName: string;
  model: string;
  version: string;
  matchReason: string[];
  keyStrengths: string[];
  recommendationType: "close_match" | "close_match_2" | "trade_off" | "trade_off_option";
  weight_g?: number;
  weight_feel_1to5?: 1 | 2 | 3 | 4 | 5;
  heel_drop_mm: number;
  has_plate: boolean;
  plate_material: "Nylon" | "Plastic" | "Carbon" | null;
  tradeOffs?: string[];
  similar_to?: string;
  shoeId?: string;
  role?: string; // For Shopping Mode - attached role
  archetype?: string; // For Discovery Mode - attached archetype
  archetypes?: string[]; // Array of archetypes this shoe works for
  // Use case booleans for "also works for" popover
  use_daily?: boolean;
  use_easy_recovery?: boolean;
  use_tempo_workout?: boolean;
  use_speed_intervals?: boolean;
  use_race?: boolean;
  use_trail?: boolean;
}

interface ShoeCarouselProps {
  recommendations: RecommendedShoe[];
  role: "daily" | "tempo" | "race" | "easy" | "long" | "trail";
  shortlistedShoes?: string[];
  onShortlist?: (shoeId: string) => void;
  showRoleBadges?: boolean; // Whether to show role badges on cards (Shopping Mode)
}

export function ShoeCarousel({ recommendations, role, shortlistedShoes = [], onShortlist, showRoleBadges = false }: ShoeCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const totalSlides = recommendations.length;
  // Always start on middle card (index 1) when there are 3+ slides
  const initialSlideIndex = totalSlides >= 3 ? 1 : 0;
  const [activeIndex, setActiveIndex] = useState(initialSlideIndex);

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
    setActiveIndex(swiper.activeIndex);
  };

  if (totalSlides === 0) {
    return null;
  }

  // Single card - no carousel needed
  if (totalSlides === 1) {
    const shoe = recommendations[0];
    const shoeId = shoe.shoeId || shoe.fullName;
    return (
      <div className="flex flex-col items-center py-1 px-4 h-full">
        <ShoeCard 
          shoe={shoe} 
          role={role} 
          position={1}
          isShortlisted={shortlistedShoes.includes(shoeId)}
          onShortlist={() => onShortlist?.(shoeId)}
          showRoleBadge={showRoleBadges}
        />
      </div>
    );
  }

  return (
    <div className="shoe-carousel w-full py-2 flex flex-col" style={{ minHeight: '580px' }}>
      <Swiper
        modules={[Keyboard]}
        spaceBetween={32}
        slidesPerView={1.2}
        centeredSlides={true}
        initialSlide={initialSlideIndex}
        loop={false}
        watchSlidesProgress={true}
        keyboard={{ enabled: true }}
        grabCursor={true}
        style={{ height: '560px' }}
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
        {recommendations.map((shoe, index) => {
          const shoeId = shoe.shoeId || shoe.fullName;
          return (
            <SwiperSlide
              key={`${shoeId}-${index}`}
              aria-label={`Shoe ${index + 1} of ${totalSlides}: ${shoe.fullName}`}
            >
              <div className="flex justify-center items-center" style={{ height: '560px' }}>
                <ShoeCard 
                  shoe={shoe} 
                  role={role} 
                  position={((index % 3) + 1) as 1 | 2 | 3}
                  isShortlisted={shortlistedShoes.includes(shoeId)}
                  onShortlist={() => onShortlist?.(shoeId)}
                  showRoleBadge={showRoleBadges}
                />
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Pagination Dots */}
      {totalSlides > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          {recommendations.map((_, index) => (
            <button
              key={index}
              onClick={() => swiperRef.current?.slideTo(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index === activeIndex 
                  ? "bg-primary scale-110" 
                  : "bg-card-foreground/40 hover:bg-card-foreground/60"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ShoeCarousel;
