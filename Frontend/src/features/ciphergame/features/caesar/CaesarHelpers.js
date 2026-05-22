export const caesarEncryptWord = (word, shift = 3) => {
  return word
    .split('')
    .map((char) => shiftChar(char, shift))
    .join('');
};

export const caesarDecryptWord = (word, shift = 3) => {
  return word
    .split('')
    .map((char) => shiftChar(char, -shift))
    .join('');
};

const shiftChar = (char, shift) => {
  const isLetter = char.match(/[a-z]/i);
  if (!isLetter) return char;

  const base = char === char.toUpperCase() ? 65 : 97;
  const code = char.charCodeAt(0) - base;
  const shifted = (code + shift + 26) % 26;

  return String.fromCharCode(shifted + base);
};