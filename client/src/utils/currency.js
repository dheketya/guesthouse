// Format price in both USD and KHR
export function formatPrice(amountUSD, exchangeRate) {
  const usd = Number(amountUSD) || 0;
  const rate = Number(exchangeRate) || 4100;
  const khr = Math.round(usd * rate);
  return `$${usd.toFixed(2)} / ${khr.toLocaleString()}៛`;
}

// Short format (no decimals for USD)
export function formatPriceShort(amountUSD, exchangeRate) {
  const usd = Number(amountUSD) || 0;
  const rate = Number(exchangeRate) || 4100;
  const khr = Math.round(usd * rate);
  return `$${usd.toFixed(0)} / ${khr.toLocaleString()}៛`;
}

// USD only
export function formatUSD(amount) {
  return `$${(Number(amount) || 0).toFixed(2)}`;
}

// KHR only
export function formatKHR(amountUSD, exchangeRate) {
  const rate = Number(exchangeRate) || 4100;
  return `${Math.round((Number(amountUSD) || 0) * rate).toLocaleString()}៛`;
}
