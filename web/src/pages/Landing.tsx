import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Odometer } from '../components/Odometer';
import { Vitrine } from '../components/Vitrine';
import { apiGet } from '../lib/api';
import { formatPrice } from '../types';

interface Stats {
  totals: { listings: number; available: number; sold: number; donated: number };
  impact: { kg: number; moneyCents: number };
}

// Landing: hero compacto com O PLACAR + vitrine espiando no primeiro viewport
// (o edital lista a vitrine explicitamente na landing — DESIGN.md, layout).
export function Landing() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiGet<Stats>('/api/stats').then(setStats).catch(() => {});
  }, []);

  const kg = stats ? Math.round(stats.impact.kg) : 0;

  return (
    <div>
      <section className="placar-hero">
        {/* O caption é o h1 da página; o total numérico vive no sr-only
            (as tiras do odômetro são aria-hidden — DESIGN.md). */}
        <h1 className="placar-caption">
          <span className="sr-only">{kg} </span>
          KG resgatados do lixo — UNIFOR
        </h1>

        <Odometer value={kg} />

        <div className="placar-sub">
          {stats && (
            <span className="price-splash placar-money">
              {formatPrice(stats.impact.moneyCents)} economizados
            </span>
          )}
          <p className="placar-pitch">
            O material que o veterano guarda é o que o calouro procura. Anuncie, doe e
            encontre itens usados dentro do campus.
          </p>
          <div className="placar-ctas">
            <Link to="/new" className="btn">
              Anunciar agora
            </Link>
            <a href="#vitrine" className="btn btn--ghost">
              Ver vitrine
            </a>
          </div>
        </div>
      </section>

      <section id="vitrine" className="vitrine-section">
        <h2>Vitrine</h2>
        <Vitrine />
      </section>
    </div>
  );
}
