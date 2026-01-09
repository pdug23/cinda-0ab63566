import { useRef, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Keyboard } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { ShoeCard } from "./ShoeCard";

import "swiper/css";
import "swiper/css/pagination";

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

const ROLE_COLORS: Record<string, string> = {
  daily: "#F97316",
  tempo: "#3B82F6",
  race: "#EF4444",
  easy: "#10B981",
  long: "#8B5CF6",
  trail: "#92400E",
};

export function ShoeCarousel({ recommendations, role }: ShoeCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const roleColor = ROLE_COLORS[role] || ROLE_COLORS.daily;
  const totalSlides = recommendations.length;

  // Disable loop if only 1 recommendation
  const enableLoop = totalSlides > 1;

  useEffect(() => {
    // Inject custom styles for pagination bullets
    const style = document.createElement("style");
    style.id = "swiper-custom-styles";
    style.textContent = `
      .shoe-carousel .swiper-pagination-bullet {
        width: 8px;
        height: 8px;
        background: rgba(255, 255, 255, 0.3);
        opacity: 1;
        transition: all 200ms ease-out;
        margin: 0 6px !important;
      }
      .shoe-carousel .swiper-pagination-bullet-active {
        background: ${roleColor};
        opacity: 1;
      }
      .shoe-carousel .swiper-slide {
        transition: transform 250ms ease-out, opacity 250ms ease-out;
        opacity: 0.6;
        transform: scale(0.95);
      }
      .shoe-carousel .swiper-slide-active {
        opacity: 1;
        transform: scale(1);
      }
      .shoe-carousel .swiper-pagination {
        position: relative;
        margin-top: 16px;
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
  }, [roleColor]);

  const handleSlideChange = (swiper: SwiperType) => {
    // Update counter on slide change
    const counter = document.getElementById("slide-counter");
    if (counter) {
      counter.textContent = `${swiper.realIndex + 1} of ${totalSlides}`;
    }
  };

  if (totalSlides === 0) {
    return null;
  }

  // Single card - no carousel needed
  if (totalSlides === 1) {
    return (
      <div className="flex flex-col items-center py-5 px-4">
        <ShoeCard shoe={recommendations[0]} role={role} />
      </div>
    );
  }

  return (
    <div className="shoe-carousel w-full py-5">
      <Swiper
        modules={[Pagination, Keyboard]}
        spaceBetween={16}
        slidesPerView={1.3}
        centeredSlides={true}
        loop={enableLoop}
        keyboard={{ enabled: true }}
        grabCursor={true}
        pagination={{
          clickable: true,
          el: ".swiper-pagination",
        }}
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
          paginationBulletMessage: "Go to shoe {{index}}",
        }}
        aria-label="Shoe recommendations carousel"
      >
        {recommendations.map((shoe, index) => (
          <SwiperSlide
            key={shoe.shoeId || `shoe-${index}`}
            aria-label={`Shoe ${index + 1} of ${totalSlides}: ${shoe.fullName}`}
          >
            <div className="flex justify-center">
              <ShoeCard shoe={shoe} role={role} />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Pagination and counter */}
      <div className="flex flex-col items-center gap-3 mt-4">
        <div className="swiper-pagination" />
        <span
          id="slide-counter"
          className="text-sm text-foreground/50"
          aria-live="polite"
        >
          1 of {totalSlides}
        </span>
      </div>
    </div>
  );
}

export default ShoeCarousel;
