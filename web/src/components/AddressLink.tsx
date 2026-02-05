import { getAddressUrl } from '@/lib/clients';
import { shortenAddress } from '@/lib/format';

export function AddressLink({ 
  address, 
  shorten = true,
  label
}: { 
  address: `0x${string}`; 
  shorten?: boolean;
  label?: string;
}) {
  const displayAddress = shorten ? shortenAddress(address, 4) : address;
  
  return (
    <a
      href={getAddressUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-red-400 hover:text-red-300 underline decoration-red-400/30 hover:decoration-red-300/50 transition-colors font-mono text-sm"
      title={address}
    >
      {label || displayAddress}
    </a>
  );
}
