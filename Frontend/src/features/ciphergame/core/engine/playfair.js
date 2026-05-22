export function playfairEncrypt(text) {
  // simplified placeholder (you can upgrade later)
  return text.toUpperCase().replace(/J/g, "I").split("").reverse().join("");
}