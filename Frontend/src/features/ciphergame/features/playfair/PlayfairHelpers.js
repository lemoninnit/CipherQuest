export const generateMatrix = (key) => {
  const seen = new Set();
  const letters = [];

  const clean = key.toUpperCase().replace(/J/g, 'I');

  for (const c of clean) {
    if (!seen.has(c)) {
      seen.add(c);
      letters.push(c);
    }
  }

  for (let i = 65; i <= 90; i++) {
    const c = String.fromCharCode(i);
    if (c === 'J') continue;
    if (!seen.has(c)) {
      seen.add(c);
      letters.push(c);
    }
  }

  const matrix = [];
  for (let i = 0; i < 5; i++) {
    matrix.push(letters.slice(i * 5, i * 5 + 5));
  }

  return matrix;
};