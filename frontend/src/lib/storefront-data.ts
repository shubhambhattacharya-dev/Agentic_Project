export type HeroSlide = {
  eyebrow: string;
  title: string;
  copy: string;
  image: string;
  accent: "green" | "yellow" | "forest";
  bullets: string[];
};

export type Product = {
  id: string;
  name: string;
  image: string;
  accent: string;
  price: number;
  description: string;
  benefits: string[];
  options: Array<{ label: string; price: number }>;
};

export type EventCard = {
  title: string;
  copy: string;
  image: string;
};

export const storefront = {
  nav: ["Home", "Shop all", "Distributors", "Tasting events", "Contact"],
  heroSlides: [
    {
      eyebrow: "Sugar-free energy",
      title: "Power up with vitamin-rich clean energy.",
      copy: "A bright, sugar-free energy drink built around green tea caffeine, taurine, vitamin C, and B vitamins for focus without the heavy crash.",
      image: "https://gigienergy.com/cdn/shop/files/Slide4.png?v=1779793970&width=3840",
      accent: "green",
      bullets: ["75mg caffeine", "1000mg taurine", "Zero sugar", "Natural flavours", "B vitamins", "Green tea extract"],
    },
    {
      eyebrow: "Focus for active days",
      title: "A tropical boost for workouts, work, and long days.",
      copy: "Light fruit flavour, functional ingredients, and a crisp finish make the drink feel more like daily fuel than a heavy soda.",
      image: "https://gigienergy.com/cdn/shop/files/Slide5.png?v=1779793870&width=3840",
      accent: "yellow",
      bullets: ["Green tea caffeine", "5 B vitamins", "Vitamin C", "Zero sugar", "Light sweetness", "Clean finish"],
    },
    {
      eyebrow: "Built for movement",
      title: "Energy for training, studying, driving, and building.",
      copy: "A lifestyle-first formula for people who need a steady lift before the gym, a late shift, a pitch, or a tough final round.",
      image: "https://gigienergy.com/cdn/shop/files/Slide1.png?v=1779792175&width=3840",
      accent: "forest",
      bullets: ["Running", "Gym", "Pickleball", "Pilates", "Motorsport", "Cycling"],
    },
  ] satisfies HeroSlide[],
  logos: ["GoRally", "Cult", "Snowflake", "J.P. Morgan", "Cognizant", "Google", "TCS", "Infosys", "Accenture", "Amadeus"],
  products: [
    {
      id: "lemon-lime",
      name: "Lemon Lime",
      image: "https://gigienergy.com/cdn/shop/files/ll-black.jpg?v=1780048000&width=1400",
      accent: "#7ed321",
      price: 125,
      description: "Crisp citrus energy with a sharper lime finish and restrained sweetness.",
      benefits: ["Zero sugar", "Natural fruit flavours", "C plus B vitamin complex", "75mg caffeine"],
      options: [
        { label: "One can", price: 125 },
        { label: "4 Pack", price: 396 },
        { label: "24 Pack", price: 2250 },
      ],
    },
    {
      id: "pineapple-coconut",
      name: "Pineapple Coconut",
      image: "https://gigienergy.com/cdn/shop/files/pc-black.jpg?v=1780048560&width=1400",
      accent: "#f4db3f",
      price: 125,
      description: "A smoother tropical profile for steady energy through longer sessions.",
      benefits: ["Zero sugar", "Natural fruit flavours", "Vitamin-rich", "Green tea extract"],
      options: [
        { label: "One can", price: 125 },
        { label: "4 Pack", price: 396 },
        { label: "24 Pack", price: 2250 },
      ],
    },
    {
      id: "mixed-pack",
      name: "Trial Pack",
      image: "https://gigienergy.com/cdn/shop/files/Mix_Pack_Gigi_Energydrinks.png?v=1779800329&width=1400",
      accent: "#111111",
      price: 396,
      description: "A mixed pack with both flavours when you want the citrus and tropical lane together.",
      benefits: ["2 cans each", "Low calorie", "No added sugar", "250ml cans"],
      options: [{ label: "Mixed 4 Pack", price: 396 }],
    },
  ] satisfies Product[],
  nutrition: [
    ["Calories", "7.5 Kcal"],
    ["Total fat", "0.0g"],
    ["Added sugar", "0.0g"],
    ["Vitamin C", "33.6mg"],
    ["Niacin", "7.2mg"],
    ["Vitamin B12", "0.9mcg"],
  ],
  formulaImage: "https://gigienergy.com/cdn/shop/t/4/assets/gigi-lime-ingredients.jpg?v=106579440915366066931780113386",
  events: [
    {
      title: "Gyms and Studios",
      copy: "Sampling sessions for members before classes, training blocks, or weekend events.",
      image: "https://gigienergy.com/cdn/shop/t/4/assets/gigi-tasting-gym-studios.jpg?v=126874866793950285631780113388",
    },
    {
      title: "Corporate Offices",
      copy: "A free pop-up tasting for teams, clients, and high-energy office days.",
      image: "https://gigienergy.com/cdn/shop/t/4/assets/gigi-tasting-corporate-offices.jpg?v=145977064806988479261780113387",
    },
    {
      title: "Event Organizers",
      copy: "A compact sampling activation for sports events, launches, and community meets.",
      image: "https://gigienergy.com/cdn/shop/t/4/assets/gigi-tasting-event-organizers.jpg?v=128308420380846395371780113388",
    },
  ] satisfies EventCard[],
};

export async function getStorefront() {
  await new Promise((resolve) => window.setTimeout(resolve, 220));
  return storefront;
}
