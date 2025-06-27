// Token utility functions
export function parseJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse JWT payload:', error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return true;
  
  const currentTime = Date.now() / 1000;
  return payload.exp < currentTime;
}

export function getTokenExpiration(token: string): Date | null {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return null;
  
  return new Date(payload.exp * 1000);
}

export function getTokenTimeToExpiry(token: string): number {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return 0;
  
  const currentTime = Date.now() / 1000;
  return Math.max(0, payload.exp - currentTime);
}

export function shouldRefreshToken(token: string, bufferMinutes: number = 5): boolean {
  const timeToExpiry = getTokenTimeToExpiry(token);
  const bufferSeconds = bufferMinutes * 60;
  return timeToExpiry <= bufferSeconds;
}

export function formatTokenExpiry(token: string): string {
  const expiration = getTokenExpiration(token);
  if (!expiration) return 'Invalid token';
  
  return expiration.toLocaleString();
} 