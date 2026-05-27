import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  showDetails?: boolean;
  silent?: boolean;
}

const ConnectionStatus = ({ silent = false }: ConnectionStatusProps) => {
  const { isConnected, connectionQuality } = useGlobalRealtime({ silent });

  if (silent) return null;

  const color = !isConnected
    ? 'bg-red-500'
    : connectionQuality === 'excellent'
      ? 'bg-green-500'
      : connectionQuality === 'good'
        ? 'bg-green-400'
        : 'bg-yellow-400';

  const label = !isConnected
    ? 'Reconectando...'
    : 'Conectado';

  return (
    <div
      className="fixed bottom-2 right-2 z-50 flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-gray-700 shadow-sm backdrop-blur"
      title={label}
    >
      <span className={`h-2 w-2 rounded-full ${color} ${!isConnected ? 'animate-pulse' : ''}`} />
      {isConnected ? (
        <Wifi className="h-3 w-3 text-green-600" />
      ) : (
        <WifiOff className="h-3 w-3 text-red-500" />
      )}
    </div>
  );
};

export default ConnectionStatus;
