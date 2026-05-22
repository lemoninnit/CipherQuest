export function caesarEncrypt(text, shift = 3) {
  return text
    .toUpperCase()
    .split("")
    .map(char => {
      const code = char.charCodeAt(0);
      if (code < 65 || code > 90) return char;
      return String.fromCharCode(((code - 65 + shift) % 26) + 65);
    })
    .join("");
}