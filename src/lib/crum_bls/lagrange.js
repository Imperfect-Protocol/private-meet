import { Fr, G1, G2 } from './curves.js';

function labelToScalar(label) {
  return Fr.create(BigInt(label));
}

function lagrangeCoefficientAtZero(index, labels) {
  const xI = labels[index];
  let coefficient = Fr.ONE;
  for (let j = 0; j < labels.length; j += 1) {
    if (index === j) continue;
    const xJ = labels[j];
    const denominator = Fr.sub(xJ, xI);
    if (denominator === Fr.ZERO) {
      throw new Error('Failed to invert denominator');
    }
    coefficient = Fr.mul(coefficient, Fr.mul(xJ, Fr.inv(denominator)));
  }
  return coefficient;
}

export function combine(shares) {
  let combined = G1.ZERO;
  const labels = shares.map(([label]) => labelToScalar(label));
  for (let i = 0; i < shares.length; i += 1) {
    const signature = shares[i][1];
    combined = combined.add(signature.multiply(lagrangeCoefficientAtZero(i, labels)));
  }
  return combined;
}

export function recover(shares) {
  let recovered = G2.ZERO;
  const labels = shares.map(([label]) => labelToScalar(label));
  for (let i = 0; i < shares.length; i += 1) {
    const publicKey = shares[i][1];
    recovered = recovered.add(publicKey.multiply(lagrangeCoefficientAtZero(i, labels)));
  }
  return recovered;
}
