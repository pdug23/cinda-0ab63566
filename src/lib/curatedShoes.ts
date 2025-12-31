// src/lib/curatedShoes.ts

export const CURATED_SHOE_NAMES = [
  "Adidas Evo SL",
  "Nike Pegasus Premium",
  "Hoka Bondi 9",
  "Mizuno Neo Zen",
  "Salomon Aero Glide 2",
  "Skechers Aero Burst",
  "Nike Vomero Plus",
  "New Balance FuelCell Rebel v5",
  "Puma MagMax Nitro",
] as const;

export const CURATED_SHOES = {
  daily_trainer_modern_bouncy: [...CURATED_SHOE_NAMES],
} as const;
