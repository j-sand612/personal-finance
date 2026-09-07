// Squarified treemap layout (Bruls et al.). Lays out `items` (each needing a
// numeric `value`) into rectangles filling the box [x, y, x+w, y+h], area-proportional
// to value. Returns the same items with x/y/w/h added.
export function squarify(items, x, y, w, h) {
  const out = [];
  const total = items.reduce((s, d) => s + d.value, 0);
  if (total <= 0 || !items.length || w <= 0 || h <= 0) return out;

  function ratio(row, rowSum, side, area) {
    const rowArea = area;
    let maxA = -Infinity, minA = Infinity;
    row.forEach((d) => {
      const a = (d.value / rowSum) * rowArea;
      if (a > maxA) maxA = a;
      if (a < minA) minA = a;
    });
    return Math.max((side * side * maxA) / (rowArea * rowArea), (rowArea * rowArea) / (side * side * minA));
  }

  function layoutRow(row, rx, ry, rw, rh, horizontal) {
    const rowSum = row.reduce((s, d) => s + d.value, 0);
    let offset = horizontal ? rx : ry;
    row.forEach((d) => {
      const frac = rowSum > 0 ? d.value / rowSum : 0;
      if (horizontal) {
        const segW = frac * rw;
        out.push({ ...d, x: offset, y: ry, w: segW, h: rh });
        offset += segW;
      } else {
        const segH = frac * rh;
        out.push({ ...d, x: rx, y: offset, w: rw, h: segH });
        offset += segH;
      }
    });
  }

  function recurse(items, x, y, w, h) {
    if (!items.length || w <= 0 || h <= 0) return;
    if (items.length === 1) {
      out.push({ ...items[0], x, y, w, h });
      return;
    }
    const total = items.reduce((s, d) => s + d.value, 0);
    const horizontal = w >= h;
    const side = horizontal ? h : w;
    const fullArea = w * h;

    let row = [items[0]];
    let rowSum = items[0].value;
    let i = 1;
    while (i < items.length) {
      const nextRow = row.concat([items[i]]);
      const nextSum = rowSum + items[i].value;
      const rowArea = (rowSum / total) * fullArea;
      const nextArea = (nextSum / total) * fullArea;
      const currentWorst = ratio(row, rowSum, side, rowArea);
      const nextWorst = ratio(nextRow, nextSum, side, nextArea);
      if (nextWorst <= currentWorst) {
        row = nextRow;
        rowSum = nextSum;
        i++;
      } else {
        break;
      }
    }

    const rowAreaFinal = (rowSum / total) * fullArea;
    const rowLen = rowAreaFinal / side;

    if (horizontal) {
      layoutRow(row, x, y, rowLen, h, false);
      recurse(items.slice(i), x + rowLen, y, w - rowLen, h);
    } else {
      layoutRow(row, x, y, w, rowLen, true);
      recurse(items.slice(i), x, y + rowLen, w, h - rowLen);
    }
  }

  recurse(
    items.slice().sort((a, b) => b.value - a.value),
    x, y, w, h
  );
  return out;
}
