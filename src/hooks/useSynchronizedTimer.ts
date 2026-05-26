import { useState, useEffect, useRef, useCallback } from 'react';
import { Rodada } from '@/types/database';

interface UseSynchronizedTimerOptions {
  onTimeUp?: () => void;
  onWarning?: (secondsLeft: number) => void;
  warningThreshold?: number;
}

/**
 * Timer sincronizado entre dispositivos.
 * Fonte de verdade: rodada.iniciou_em + rodada.retomada_em + rodada.tempo_decorrido_acumulado.
 *
 * - status = 'ativa'      → restante = tempo_limite - tempo_decorrido_acumulado - (now - retomada_em||iniciou_em)
 * - status = 'pausada'    → restante = tempo_limite - tempo_decorrido_acumulado  (congelado)
 * - status = 'aguardando' → restante = tempo_limite (cheio)
 * - status = 'finalizada' → restante = 0  (nunca dispara onTimeUp automaticamente)
 *
 * Proteção: se o usuário abrir uma rodada que já expirou (status ainda 'ativa' mas tempo<=0),
 * o componente mostra 0 sem disparar onTimeUp — quem realmente finaliza é o professor.
 */
export const useSynchronizedTimer = (
  rodada: Rodada | null,
  options: UseSynchronizedTimerOptions = {}
) => {
  const { onTimeUp, onWarning, warningThreshold = 30 } = options;

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [hasWarned, setHasWarned] = useState(false);
  const hasFiredTimeUpRef = useRef(false);
  const mountedAtZeroRef = useRef(false);

  const calculateTimeRemaining = useCallback((): number => {
    if (!rodada || !rodada.tempo_limite) return 0;

    const r = rodada as any;
    const acumulado = Number(r.tempo_decorrido_acumulado || 0);
    const tempoLimite = rodada.tempo_limite;

    if (rodada.status === 'aguardando') return tempoLimite;
    if (rodada.status === 'finalizada') return 0;
    if (rodada.status === 'pausada') {
      return Math.max(0, tempoLimite - acumulado);
    }

    // ativa
    const baseIso = r.retomada_em || rodada.iniciou_em;
    if (!baseIso) return tempoLimite;
    try {
      const base = new Date(baseIso).getTime();
      const now = Date.now();
      const elapsedAtual = Math.max(0, Math.floor((now - base) / 1000));
      const remaining = tempoLimite - acumulado - elapsedAtual;
      return Math.max(0, remaining);
    } catch {
      return 0;
    }
  }, [rodada]);

  // Detectar troca de rodada → resetar guardas
  useEffect(() => {
    hasFiredTimeUpRef.current = false;
    mountedAtZeroRef.current = false;
    setHasWarned(false);
    const initial = calculateTimeRemaining();
    setTimeRemaining(initial);
    // Se já entrou em 0 numa rodada 'ativa', marcar para NÃO disparar onTimeUp automaticamente
    if (initial <= 0 && rodada?.status === 'ativa') {
      mountedAtZeroRef.current = true;
      hasFiredTimeUpRef.current = true;
    }
  }, [rodada?.id]);

  // Tick principal
  useEffect(() => {
    if (!rodada) {
      setTimeRemaining(0);
      return;
    }

    // Atualizar imediatamente ao trocar status
    const initial = calculateTimeRemaining();
    setTimeRemaining(initial);

    if (rodada.status !== 'ativa') {
      return;
    }

    const intervalId = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (!hasWarned && remaining > 0 && remaining <= warningThreshold) {
        setHasWarned(true);
        onWarning?.(remaining);
      }

      if (remaining <= 0 && !hasFiredTimeUpRef.current) {
        hasFiredTimeUpRef.current = true;
        clearInterval(intervalId);
        // Só dispara se NÃO montou já zerado (proteção contra rodada expirada)
        if (!mountedAtZeroRef.current) {
          onTimeUp?.();
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [rodada?.id, rodada?.status, rodada?.tempo_limite, (rodada as any)?.retomada_em, (rodada as any)?.tempo_decorrido_acumulado, rodada?.iniciou_em, calculateTimeRemaining, hasWarned, onTimeUp, onWarning, warningThreshold]);

  // Re-sincronizar quando a aba volta ao foco
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === 'visible') {
        setTimeRemaining(calculateTimeRemaining());
      }
    };
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, [calculateTimeRemaining]);

  const formatTime = (seconds: number) => {
    const valid = Math.max(0, Math.floor(seconds));
    const m = Math.floor(valid / 60).toString().padStart(2, '0');
    const s = (valid % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getTimeColor = () => {
    if (rodada?.status === 'pausada') return 'text-orange-600';
    if (timeRemaining <= 10) return 'text-red-600';
    if (timeRemaining <= warningThreshold) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressPercentage = () => {
    if (!rodada || !rodada.tempo_limite) return 0;
    const elapsed = rodada.tempo_limite - timeRemaining;
    return Math.min(100, Math.max(0, (elapsed / rodada.tempo_limite) * 100));
  };

  return {
    timeRemaining,
    isActive: rodada?.status === 'ativa' && timeRemaining > 0,
    isPaused: rodada?.status === 'pausada',
    isExpired: rodada?.status === 'ativa' && timeRemaining <= 0,
    pausedTime: rodada?.status === 'pausada' ? timeRemaining : null,
    formatTime,
    getTimeColor,
    getProgressPercentage,
    formattedTime: formatTime(timeRemaining),
    timeColor: getTimeColor(),
    progressPercentage: getProgressPercentage(),
  };
};
