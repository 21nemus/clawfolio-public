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
