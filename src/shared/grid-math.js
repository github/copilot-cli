const COARSE_SPACING = 100;
const FINE_SPACING = 25;
const START_OFFSET = COARSE_SPACING / 2;
const FINE_START = FINE_SPACING / 2;

function getColLetter(colIndex) {
  let letter = '';
  if (colIndex >= 26) {
    letter += String.fromCharCode(65 + Math.floor(colIndex / 26) - 1);
  }
  letter += String.fromCharCode(65 + (colIndex % 26));
  return letter;
}

function colLettersToIndex(letters) {
  if (!letters || letters.length === 0) return null;
  if (letters.length === 1) {
    return letters.charCodeAt(0) - 65;
  }
  const first = letters.charCodeAt(0) - 65 + 1;
  const second = letters.charCodeAt(1) - 65;
  return (first * 26) + second;
}

function labelToScreenCoordinates(label) {
  if (!label) return null;
  const match = label.match(/^([A-Z]+)(\d+)(\.(\d)(\d))?$/);
  if (!match) return null;

  const [, letters, rowStr, , subColStr, subRowStr] = match;
  const colIndex = colLettersToIndex(letters);
  const rowIndex = parseInt(rowStr, 10);
  if (colIndex === null || Number.isNaN(rowIndex)) return null;

  if (subColStr && subRowStr) {
    const subCol = parseInt(subColStr, 10);
    const subRow = parseInt(subRowStr, 10);
    if (Number.isNaN(subCol) || Number.isNaN(subRow)) return null;
    const fineCol = (colIndex * 4) + subCol;
    const fineRow = (rowIndex * 4) + subRow;
    const x = FINE_START + fineCol * FINE_SPACING;
    const y = FINE_START + fineRow * FINE_SPACING;
    return {
      x,
      y,
      screenX: x,
      screenY: y,
      colIndex,
      rowIndex,
      fineCol,
      fineRow,
      subCol,
      subRow,
      isFine: true
    };
  }

  const x = START_OFFSET + colIndex * COARSE_SPACING;
  const y = START_OFFSET + rowIndex * COARSE_SPACING;
  return {
    x,
    y,
    screenX: x,
    screenY: y,
    colIndex,
    rowIndex,
    isFine: false
  };
}

module.exports = {
  constants: {
    coarseSpacing: COARSE_SPACING,
    fineSpacing: FINE_SPACING,
    startOffset: START_OFFSET,
    fineStart: FINE_START,
    localFineRadius: 3
  },
  getColLetter,
  colLettersToIndex,
  labelToScreenCoordinates
};
