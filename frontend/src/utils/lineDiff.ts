export interface DiffLine {
  type: 'same' | 'add' | 'del';
  text: string;
}

export function buildSimpleLineDiff(oldCode: string, newCode: string): DiffLine[] {
  const a = oldCode.split('\n');
  const b = newCode.split('\n');
  const m = a.length;
  const n = b.length;
  if (m * n > 25000) {
    return [
      ...a.slice(0, 60).map((t) => ({ type: 'del' as const, text: t })),
      ...b.slice(0, 60).map((t) => ({ type: 'add' as const, text: t })),
    ];
  }
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const diff: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      diff.push({ type: 'same', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      diff.push({ type: 'del', text: a[i] });
      i++;
    } else {
      diff.push({ type: 'add', text: b[j] });
      j++;
    }
  }
  while (i < m) diff.push({ type: 'del', text: a[i++] });
  while (j < n) diff.push({ type: 'add', text: b[j++] });
  return diff;
}
