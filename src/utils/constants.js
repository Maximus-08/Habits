export const LEVELS = [
  { level: 1, name: "Seedling", minVotes: 0 },
  { level: 2, name: "Sprout", minVotes: 25 },
  { level: 3, name: "Grower", minVotes: 75 },
  { level: 4, name: "Contender", minVotes: 150 },
  { level: 5, name: "Atomic", minVotes: 300 },
  { level: 6, name: "1% Machine", minVotes: 600 },
  { level: 7, name: "Compounding", minVotes: 1200 },
  { level: 8, name: "Identity Locked", minVotes: 2500 },
];

export function calculateLevelFromVotes(totalVotes) {
  let activeLevel = 1;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalVotes >= LEVELS[i].minVotes) {
      activeLevel = LEVELS[i].level;
      break;
    }
  }
  return activeLevel;
}
