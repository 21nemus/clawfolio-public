import { getTxUrl } from '@/lib/clients';
import { shortenAddress } from '@/lib/format';

export function TxLink({ hash, shorten = true }: { hash: `0x${string}`; shorten?: boolean }) {
  const displayHash = shorten ? shortenAddress(hash, 6) : hash;
  
  return (
    <a
      href={getTxUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-red-400 hover:text-red-300 underline decoration-red-400/30 hover:decoration-red-300/50 transition-colors font-mono text-sm"
    >
      {displayHash}
    </a>
  );
}
