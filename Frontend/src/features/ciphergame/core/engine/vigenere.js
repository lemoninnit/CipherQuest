export function vigenereEncrypt(text, key = "KEY") {
  text = text.toUpperCase();
  key = key.toUpperCase();

  let result = "";
  let j = 0;

  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);

    if (c < 65 || c > 90) {
      result += text[i];
      continue;
    }

    const shift = key.charCodeAt(j % key.length) - 65;
    result += String.fromCharCode(((c - 65 + shift) % 26) + 65);
    j++;
  }

  return result;
}