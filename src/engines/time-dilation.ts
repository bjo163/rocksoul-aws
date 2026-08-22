// @ts-nocheck
/**
 * Time Dilation Engine (Eschatological Physics)
 * 
 * References the theological premise: 
 * "A day with your Lord is like a thousand years of your reckoning" (Quran 22:47)
 * 
 * This engine converts Mizan Deviation Scores into Cosmic/Divine Punishment Time
 * and translates it back to Human/Earth years for comprehension.
 */

const HUMAN_YEARS_PER_DIVINE_DAY = 1000;
const DAYS_PER_YEAR = 365.25;

export function calculatePunishmentDuration(deviationScore, scaleFactor) {
  if (!deviationScore || deviationScore <= 0) {
    return {
      divineDays: 0,
      humanYears: 0,
      formattedHuman: "0 Hari (Aman / Dimaafkan)",
      isEternal: false
    };
  }

  // Formula: Dosa dihitung eksponensial berdasarkan skala kerusakan
  // Contoh: Deviasi 55, Scale 0.74 -> 55^1.25 * 0.74 = ~110 Hari Ilahi
  const rawDivineDays = Math.pow(deviationScore, 1.25) * Math.max(0.1, scaleFactor);
  
  // Jika dosa sangat masif (kekufuran absolut, kemusyrikan absolut), bisa menjadi kekal (infinity)
  // Untuk simulasi ini, kita tetapkan batas atas (misal > 10,000 hari ilahi = kekal)
  const isEternal = rawDivineDays > 10000;
  
  const divineDays = isEternal ? Infinity : Number(rawDivineDays.toFixed(2));
  const humanYears = isEternal ? Infinity : Math.round(divineDays * HUMAN_YEARS_PER_DIVINE_DAY);
  
  let formattedHuman = "";
  if (isEternal) {
    formattedHuman = "Kekal Abadi (Infinity)";
  } else if (humanYears > 1000000) {
    formattedHuman = `${(humanYears / 1000000).toFixed(2)} Juta Tahun Bumi`;
  } else if (humanYears > 1000) {
    formattedHuman = `${(humanYears / 1000).toFixed(1)} Ribu Tahun Bumi`;
  } else {
    formattedHuman = `${humanYears} Tahun Bumi`;
  }

  return {
    divineDays,
    humanYears,
    formattedHuman,
    isEternal
  };
}
