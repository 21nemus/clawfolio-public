/**
 * Nad.fun Client Helpers
 */

import { PublicClient } from 'viem';
import { CURVE, LENS } from './constants';
import { curveAbi, lensAbi } from './abi';

export interface UploadImageResponse {
  image_uri?: string;
  url?: string;
  image_url?: string;
  is_nsfw?: boolean;
}

export interface UploadMetadataResponse {
  metadata_uri: string;
}

export interface MineSaltResponse {
  salt: string;
  predictedAddress: string;
}

/**
 * Upload image via internal proxy
 */
export async function uploadImage(file: File): Promise<UploadImageResponse> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch('/api/nadfun/image', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image upload failed: ${err}`);
  }

  return res.json();
}

/**
 * Upload image from URL via internal proxy
 * Fetches image from URL and forwards to Nad.fun
 */
export async function uploadImageFromUrl(url: string): Promise<UploadImageResponse> {
  const res = await fetch('/api/nadfun/image-from-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image upload from URL failed: ${err}`);
  }

  return res.json();
}

/**
 * Upload metadata via internal proxy
 */
export async function uploadMetadata(payload: {
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}): Promise<UploadMetadataResponse> {
  const res = await fetch('/api/nadfun/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Metadata upload failed: ${err}`);
  }

  return res.json();
}

/**
 * Mine salt via internal proxy
 */
export async function mineSalt(payload: {
  creator: string;
  name: string;
  symbol: string;
  metadata_uri: string;
}): Promise<MineSaltResponse> {
  const res = await fetch('/api/nadfun/salt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Salt mining failed: ${err}`);
  }

  return res.json();
}

/**
 * Read deploy fee from CURVE.feeConfig()[0]
 */
export async function getDeployFee(publicClient: PublicClient): Promise<bigint> {
  const [deployFee] = await publicClient.readContract({
    address: CURVE,
    abi: curveAbi,
    functionName: 'feeConfig',
  });
  return deployFee;
}

/**
 * Get initial buy amountOut from LENS
 */
export async function getInitialBuyAmountOut(
  publicClient: PublicClient,
  amountIn: bigint
): Promise<bigint> {
  return publicClient.readContract({
    address: LENS,
    abi: lensAbi,
    functionName: 'getInitialBuyAmountOut',
    args: [amountIn],
  });
}

/**
 * Get token progress from LENS
 */
export async function getProgress(
  publicClient: PublicClient,
  token: `0x${string}`
): Promise<bigint> {
  return publicClient.readContract({
    address: LENS,
    abi: lensAbi,
    functionName: 'getProgress',
    args: [token],
  }) as Promise<bigint>;
}

/**
 * Get token flags (graduated, locked) from LENS
 */
export async function getTokenFlags(
  publicClient: PublicClient,
  token: `0x${string}`
): Promise<{ isGraduated: boolean; isLocked: boolean }> {
  const [isGraduated, isLocked] = await Promise.all([
    publicClient.readContract({
      address: LENS,
      abi: lensAbi,
      functionName: 'isGraduated',
      args: [token],
    }) as Promise<boolean>,
    publicClient.readContract({
      address: LENS,
      abi: lensAbi,
      functionName: 'isLocked',
      args: [token],
    }) as Promise<boolean>,
  ]);
  return { isGraduated, isLocked };
}

/**
 * Get curve state from CURVE contract
 */
export async function getCurveState(
  publicClient: PublicClient,
  token: `0x${string}`
): Promise<{
  realMonReserve: bigint;
  realTokenReserve: bigint;
  virtualMonReserve: bigint;
  virtualTokenReserve: bigint;
  k: bigint;
  targetTokenAmount: bigint;
  initVirtualMonReserve: bigint;
  initVirtualTokenReserve: bigint;
}> {
  const result = await publicClient.readContract({
    address: CURVE,
    abi: curveAbi,
    functionName: 'curves',
    args: [token],
  });
  
  return {
    realMonReserve: result[0],
    realTokenReserve: result[1],
    virtualMonReserve: result[2],
    virtualTokenReserve: result[3],
    k: result[4],
    targetTokenAmount: result[5],
    initVirtualMonReserve: result[6],
    initVirtualTokenReserve: result[7],
  };
}

/**
 * Get buy quote (MON → Tokens)
 */
export async function getBuyQuote(
  publicClient: PublicClient,
  token: `0x${string}`,
  monIn: bigint
): Promise<bigint> {
  const result = await publicClient.readContract({
    address: LENS,
    abi: lensAbi,
    functionName: 'getAmountOut',
    args: [token, monIn, true],
  });
  // Returns [router, amountOut]
  return result[1];
}

/**
 * Get sell quote (Tokens → MON)
 */
export async function getSellQuote(
  publicClient: PublicClient,
  token: `0x${string}`,
  tokenIn: bigint
): Promise<bigint> {
  const result = await publicClient.readContract({
    address: LENS,
    abi: lensAbi,
    functionName: 'getAmountOut',
    args: [token, tokenIn, false],
  });
  // Returns [router, amountOut]
  return result[1];
}

/**
 * Get available buyable tokens
 */
export async function getAvailableBuy(
  publicClient: PublicClient,
  token: `0x${string}`
): Promise<{ availableBuyToken: bigint; requiredMonAmount: bigint }> {
  const result = await publicClient.readContract({
    address: LENS,
    abi: lensAbi,
    functionName: 'availableBuyTokens',
    args: [token],
  });
  
  return {
    availableBuyToken: result[0],
    requiredMonAmount: result[1],
  };
}
