import { useEffect, useState } from 'react';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * O PLACAR — odômetro mecânico (elemento-assinatura, DESIGN.md).
 * Cada dígito é uma tira vertical 0-9 (Alfa Slab) numa janela overflow-hidden;
 * no load a tira rola até a posição (1.2s, stagger por dígito).
 * Acessibilidade: as tiras são aria-hidden (senão o leitor anuncia "0 1 2 …"
 * por dígito) — o valor real vive em texto sr-only no componente pai.
 * prefers-reduced-motion: transição desligada no CSS → valor final estático.
 */
export function Odometer({ value }: { value: number }) {
  const [rolled, setRolled] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setRolled(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const chars = [...String(value)];

  return (
    <span className="odometer" aria-hidden="true">
      {chars.map((ch, i) =>
        ch >= '0' && ch <= '9' ? (
          <span key={i} className="odometer-window">
            <span
              className="odometer-strip"
              style={{
                transform: `translateY(-${rolled ? Number(ch) * 10 : 0}%)`,
                transitionDelay: `${i * 90}ms`,
              }}
            >
              {DIGITS.map((d) => (
                <span key={d} className="odometer-digit">
                  {d}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} className="odometer-sep">
            {ch}
          </span>
        )
      )}
    </span>
  );
}
