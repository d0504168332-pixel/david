import { Heebo, Secular_One, Frank_Ruhl_Libre, Amatic_SC, Karantina, Caveat, Dancing_Script, Great_Vibes } from "next/font/google";

export const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo", display: "swap" });
export const display = Secular_One({ subsets: ["hebrew", "latin"], weight: "400", variable: "--font-display", display: "swap" });
export const frank = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-frank",
  display: "swap",
});
export const amatic = Amatic_SC({ subsets: ["hebrew", "latin"], weight: ["400", "700"], variable: "--font-amatic", display: "swap" });
export const karantina = Karantina({ subsets: ["hebrew", "latin"], weight: ["400", "700"], variable: "--font-karantina", display: "swap" });
export const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });
export const dancing = Dancing_Script({ subsets: ["latin"], variable: "--font-dancing", display: "swap" });
export const vibes = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-vibes", display: "swap" });

export const fontVars = [heebo, display, frank, amatic, karantina, caveat, dancing, vibes].map((f) => f.variable).join(" ");
