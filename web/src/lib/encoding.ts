/**
 * Encode metadata as data:application/json;base64,... URI
 * Uses browser-safe btoa with Unicode support
 */
export function encodeMetadataURI(metadata: {
  name: string;
  description: string;
  strategyPrompt?: string;
  image?: string;
  handle?: string;
  [key: string]: unknown;
}): string {
  const json = JSON.stringify(metadata);
  // Use TextEncoder for Unicode-safe conversion, then btoa for base64
  const bytes = new TextEncoder().encode(json);
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
  const base64 = btoa(binString);
  return `data:application/json;base64,${base64}`;
}

/**
 * Decode metadata URI back to JSON
 * Uses browser-safe atob with Unicode support
 */
export function decodeMetadataURI(uri: string): Record<string, unknown> | null {
  try {
    if (uri.startsWith('data:application/json;base64,')) {
      const base64 = uri.replace('data:application/json;base64,', '');
      const binString = atob(base64);
      const bytes = Uint8Array.from(binString, (char) => char.codePointAt(0)!);
      const json = new TextDecoder().decode(bytes);
      return JSON.parse(json);
    }
    // Could support IPFS/HTTP fetching here in the future
    return null;
  } catch (error) {
    console.error('Failed to decode metadata URI:', error);
    return null;
  }
}
