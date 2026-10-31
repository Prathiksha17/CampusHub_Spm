const STOP = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'are', 'was', 'have', 'has', 'but', 'not', 'you', 'your', 'its', 'our', 'near', 'very', 'some', 'any', 'all', 'one', 'can', 'will']);

exports.tokenize = (str = '') =>
  String(str)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

exports.jaccard = (a, b) => {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((x) => B.has(x) && inter++);
  return inter / (A.size + B.size - inter);
};

exports.escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
