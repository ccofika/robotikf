// Dnevnik smene: sva očitavanja, alarmi, zapažanja, zadaci i izveštaji poslednjih 24 h, najnovije prvo.
// Filteri su pilule sa brojem; nov događaj ulazi odozgo (kaskada 15 ms po redu, samo prvih 10).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, MapPinOff, Zap, Clock3 } from 'lucide-react';
import { cx, Led, Flag, Count } from '../../sx/ui';
import { hm, ymdOf, dayWord } from '../../lib/time';
import { feedKind } from './model';

const FILTERS = [
  { key: 'all', label: 'Sve' },
  { key: 'alarm', label: 'Alarmi' },
  { key: 'scan', label: 'Očitavanja' },
  { key: 'note', label: 'Zapažanja' },
  { key: 'task', label: 'Zadaci' },
  { key: 'report', label: 'Izveštaji' }
];
const STEP = 14;

export default function EventLog({ feed = [], now }) {
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(STEP);
  const seen = useRef(null);
  const [fresh, setFresh] = useState(new Set());

  // novi događaji posle prvog učitavanja se ističu kratko
  useEffect(() => {
    const ids = feed.map((e) => e.id);
    if (!seen.current) { seen.current = new Set(ids); return; }
    const added = ids.filter((id) => !seen.current.has(id));
    ids.forEach((id) => seen.current.add(id));
    if (added.length) {
      setFresh(new Set(added));
      const t = setTimeout(() => setFresh(new Set()), 2400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [feed]);

  const counts = useMemo(() => {
    const c = { all: feed.length };
    feed.forEach((e) => { const k = feedKind(e).key; c[k] = (c[k] || 0) + 1; });
    return c;
  }, [feed]);
  const list = feed.filter((e) => filter === 'all' || feedKind(e).key === filter);
  const shown = list.slice(0, limit);
  const today = ymdOf(now);

  return (
    <section className="sx-card sx-log" aria-labelledby="sx-log-t" data-testid="panel-feed">
      <header className="sx-log__head">
        <div>
          <h2 className="sx-card__title" id="sx-log-t">Dnevnik <Count>{feed.length}</Count></h2>
          <p className="sx-card__sub">Poslednja 24 sata, najnovije prvo. Stiže uživo sa telefona radnika.</p>
        </div>
        <div className="sx-choice sx-choice--scroll" role="tablist" aria-label="Vrsta događaja">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button key={f.key} type="button" role="tab" aria-selected={on} className={cx('sx-choice__opt', on && 'is-on')} onClick={() => { setFilter(f.key); setLimit(STEP); }} data-testid={`feed-filter-${f.key}`}>
                {on && <motion.span layoutId="sx-log-filter" className="sx-choice__bg" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />}
                <span className="sx-choice__label">{f.label}</span>
                <span className="sx-choice__count">{counts[f.key] || 0}</span>
              </button>
            );
          })}
        </div>
      </header>

      {!list.length ? (
        <div className="sx-empty sx-card__pad"><b>Nema događaja</b><span>Kad radnik prisloni telefon na tag, događaj se odmah vidi ovde.</span></div>
      ) : (
        <ol className="sx-log__list">
          {shown.map((e, i) => {
            const kind = feedKind(e);
            const flags = e.flags || [];
            const day = ymdOf(e.at);
            return (
              <li key={e.id} className={cx('sx-ev', `is-${e.level}`, fresh.has(e.id) && 'is-fresh')} style={{ '--i': Math.min(i, 10) }} data-testid="feed-item">
                <time className="sx-ev__time sx-mono" dateTime={new Date(e.at).toISOString()}>{day === today ? hm(e.at) : `${dayWord(day)} ${hm(e.at)}`}</time>
                <span className="sx-ev__kind"><Led tone={e.level === 'ok' ? 'ok' : e.level === 'bad' ? 'bad' : e.level === 'warn' ? 'warn' : 'info'} />{kind.label}</span>
                <span className="sx-ev__fac">{e.facilityName || 'Sistem'}</span>
                <span className="sx-ev__text">
                  {e.text}
                  {(flags.length > 0 || e.offline) && (
                    <span className="sx-ev__flags">
                      {e.offline && <Flag icon={WifiOff} title="Očitano bez interneta, poslato kasnije sa pravim vremenom">bez interneta</Flag>}
                      {flags.includes('far') && <Flag tone="warn" icon={MapPinOff} title="GPS telefona je bio van objekta">GPS van objekta</Flag>}
                      {flags.includes('fast') && <Flag tone="warn" icon={Zap} title="Dva taga u par sekundi: moguće da tag nije na svom mestu">prebrz obilazak</Flag>}
                      {flags.includes('clock') && <Flag tone="warn" icon={Clock3} title="Vreme na telefonu se razlikuje od servera">sat telefona</Flag>}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {list.length > limit && (
        <div className="sx-log__more">
          <button type="button" className="sx-btn sx-fill sx-btn--sm" onClick={() => setLimit((l) => l + STEP * 2)}>Prikaži još ({list.length - limit})</button>
        </div>
      )}
    </section>
  );
}
