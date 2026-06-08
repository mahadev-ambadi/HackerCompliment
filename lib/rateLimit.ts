const rateLimits = new Map<string, { count: number, resetAt: number }>();

export function rateLimit(userId: string, maxPerMinute: number = 10): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;

  let limitData = rateLimits.get(userId);

  // If there's no data or the time window has passed, reset
  if (!limitData || now > limitData.resetAt) {
    limitData = { count: 0, resetAt: now + windowMs };
    rateLimits.set(userId, limitData);
  }

  if (limitData.count >= maxPerMinute) {
    return false; // Rate limit exceeded
  }

  // Increment and allow
  limitData.count++;
  return true;
}
