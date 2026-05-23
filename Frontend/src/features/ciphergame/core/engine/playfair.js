const ALPHABET_25 = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';

export const normalizePlayfairText = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/J/g, 'I')
    .replace(/[^A-Z]/g, '');

export function generatePlayfairMatrix(key) {
  const seen = new Set();
  const letters = [];
  const source = `${normalizePlayfairText(key)}${ALPHABET_25}`;

  for (const letter of source) {
    if (letter === 'J' || seen.has(letter)) continue;
    seen.add(letter);
    letters.push(letter);
  }

  return Array.from({ length: 5 }, (_, row) => letters.slice(row * 5, row * 5 + 5));
}

export function buildPlayfairLookup(matrix) {
  const lookup = {};
  matrix.forEach((row, rowIndex) => {
    row.forEach((letter, colIndex) => {
      lookup[letter] = { row: rowIndex, col: colIndex };
    });
  });
  return lookup;
}

export function preparePlayfairDigraphs(plaintext) {
  const clean = normalizePlayfairText(plaintext);
  const pairs = [];

  for (let index = 0; index < clean.length;) {
    const first = clean[index];
    let second = clean[index + 1];

    if (!second) {
      second = 'X';
      index += 1;
    } else if (first === second) {
      second = 'X';
      index += 1;
    } else {
      index += 2;
    }

    pairs.push(`${first}${second}`);
  }

  return pairs;
}

export function transformPlayfairPair(pair, matrix, mode = 'encrypt') {
  const lookup = buildPlayfairLookup(matrix);
  const [a, b] = normalizePlayfairText(pair);
  const posA = lookup[a];
  const posB = lookup[b];

  if (!posA || !posB) {
    throw new Error(`Invalid Playfair pair: ${pair}`);
  }

  if (posA.row === posB.row) {
    const delta = mode === 'encrypt' ? 1 : -1;
    return {
      result: matrix[posA.row][(posA.col + delta + 5) % 5] +
        matrix[posB.row][(posB.col + delta + 5) % 5],
      rule: 'row',
      positions: [posA, posB],
    };
  }

  if (posA.col === posB.col) {
    const delta = mode === 'encrypt' ? 1 : -1;
    return {
      result: matrix[(posA.row + delta + 5) % 5][posA.col] +
        matrix[(posB.row + delta + 5) % 5][posB.col],
      rule: 'column',
      positions: [posA, posB],
    };
  }

  return {
    result: matrix[posA.row][posB.col] + matrix[posB.row][posA.col],
    rule: 'rectangle',
    positions: [posA, posB],
  };
}

export function playfairEncrypt(plaintext, key) {
  const matrix = generatePlayfairMatrix(key);
  return preparePlayfairDigraphs(plaintext)
    .map((pair) => transformPlayfairPair(pair, matrix, 'encrypt').result)
    .join('');
}

export function playfairDecrypt(ciphertext, key) {
  const matrix = generatePlayfairMatrix(key);
  const clean = normalizePlayfairText(ciphertext);
  const pairs = clean.match(/.{1,2}/g) || [];
  return pairs.map((pair) => transformPlayfairPair(pair, matrix, 'decrypt').result).join('');
}

export function describePlayfairRule(rule, mode = 'decrypt') {
  const direction = mode === 'decrypt' ? 'back' : 'forward';
  if (rule === 'row') return `Same row: move one column ${direction} for both letters.`;
  if (rule === 'column') return `Same column: move one row ${direction} for both letters.`;
  return 'Rectangle: keep each row, swap to the other letter column.';
}
