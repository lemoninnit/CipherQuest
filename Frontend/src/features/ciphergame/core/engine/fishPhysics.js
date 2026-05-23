export const spawnFish = () => {
  const emojis = ["🐟", "🐠", "🦈", "🐡"];

  return Array.from({ length: 6 }).map((_, i) => ({
    id: Date.now() + i,
    x: Math.random() * 90,
    y: 60 + Math.random() * 140,
    speed: 0.3 + Math.random() * 0.5,
    dir: Math.random() > 0.5 ? 1 : -1,
    value: [1, -1, 2, -2][Math.floor(Math.random() * 4)],
    emoji: emojis[Math.floor(Math.random() * emojis.length)]
  }));
};