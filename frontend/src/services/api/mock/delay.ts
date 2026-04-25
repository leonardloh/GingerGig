/**
 * Simulates realistic network latency so the UI exercises loading states
 * during development, even when hitting mock data.
 *
 * Default range (150–400 ms) matches a fast mobile connection.
 * Pass tighter or wider bounds for specific scenarios.
 */
export function mockDelay(minMs = 150, maxMs = 400): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
