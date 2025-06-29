/**
 * Determines if the current host is a platform host (vs tenant subdomain)
 * Uses environment variables for configuration
 */
export function isPlatformHost(host: string): boolean {
  const [hostname] = host.split(':');
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me';
  
  console.log('[contextUtils] isPlatformHost called with:', { host, hostname, baseDomain });
  
  // Handle localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('[contextUtils] isPlatformHost: localhost detected, returning true');
    return true;
  }
  
  // Check if it's exactly the base domain (platform)
  if (hostname === baseDomain) {
    console.log('[contextUtils] isPlatformHost: exact base domain match, returning true');
    return true;
  }
  
  // Check if it's a subdomain of the base domain (tenant)
  if (hostname.endsWith(`.${baseDomain}`)) {
    console.log('[contextUtils] isPlatformHost: subdomain detected, returning false');
    return false; // This is a tenant subdomain
  }
  
  // For other domains, use the original logic as fallback
  const parts = hostname.split('.');
  const result = parts.length <= 2;
  console.log('[contextUtils] isPlatformHost: fallback logic, parts:', parts, 'result:', result);
  return result;
}

/**
 * Extracts the tenant subdomain from the host
 * Returns null if it's a platform host
 */
export function getTenantSubdomain(host: string): string | null {
  const [hostname] = host.split(':');
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me';
  
  console.log('[contextUtils] getTenantSubdomain called with:', { host, hostname, baseDomain });
  
  // Handle localhost development - no tenant subdomain
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('[contextUtils] getTenantSubdomain: localhost detected, returning null');
    return null;
  }
  
  // Check if it's exactly the base domain (platform)
  if (hostname === baseDomain) {
    console.log('[contextUtils] getTenantSubdomain: exact base domain match, returning null');
    return null;
  }
  
  // Extract subdomain if it's a tenant
  if (hostname.endsWith(`.${baseDomain}`)) {
    const subdomain = hostname.replace(`.${baseDomain}`, '');
    console.log('[contextUtils] getTenantSubdomain: extracted subdomain:', subdomain);
    return subdomain || null;
  }
  
  console.log('[contextUtils] getTenantSubdomain: no subdomain found, returning null');
  return null;
}

/**
 * Gets the platform host URL
 */
export function getPlatformHost(): string {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me';
  const port = typeof window !== 'undefined' ? window.location.port : '';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  
  if (port && port !== '80' && port !== '443') {
    return `${protocol}//${baseDomain}:${port}`;
  }
  
  return `${protocol}//${baseDomain}`;
}

/**
 * Gets the tenant host URL for a given subdomain
 */
export function getTenantHost(subdomain: string): string {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me';
  const port = typeof window !== 'undefined' ? window.location.port : '';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  
  if (port && port !== '80' && port !== '443') {
    return `${protocol}//${subdomain}.${baseDomain}:${port}`;
  }
  
  return `${protocol}//${subdomain}.${baseDomain}`;
} 