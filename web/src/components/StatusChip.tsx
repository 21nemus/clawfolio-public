export function StatusChip({ 
  label, 
  variant = 'default' 
}: { 
  label: string; 
  variant?: 'default' | 'success' | 'warning' | 'info';
}) {
  const variantStyles = {
    default: 'bg-white/10 text-white/80 border-white/20',
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded ${variantStyles[variant]}`}>
      {label}
    </span>
  );
}
