import { TxLink } from './TxLink';
import { AddressLink } from './AddressLink';

interface ProofPanelProps {
  title: string;
  items: Array<{
    label: string;
    value: string | React.ReactNode;
  }>;
}

export function ProofPanel({ title, items }: ProofPanelProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
      <h3 className="text-lg font-semibold mb-4 text-red-400">{title}</h3>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <span className="text-sm text-white/60">{item.label}:</span>
            <div className="text-sm text-white break-all">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
