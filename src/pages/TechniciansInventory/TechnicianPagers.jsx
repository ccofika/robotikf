// Paginacija tehničarevih lista u sx izgledu, istog oblika i teksta kao ranije (stil u TechnicianInventory.mx.css i montaza.css):
// MobilePager: ‹ tekst › (radni nalozi i oprema: "Stranica X od Y"; materijali: dugmad "Prethodna"/"Sledeća" i "X od Y")
// PagePager: tekst levo, « ‹ brojevi › » desno (materijali i osnovna oprema na desktopu: "Stranica X od Y")
import React from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Btn } from '../../security/sx/ui';

export function MobilePager({ page, pages, onPage, text, prevLabel, nextLabel, narrow }) {
  if (pages <= 1) return null;
  return (
    <div className="mx-tech-mpager">
      <div className={narrow ? 'mx-tech-mpager__row is-narrow' : 'mx-tech-mpager__row'}>
        <Btn icon={ChevronLeft} onClick={() => onPage(page - 1)} disabled={page === 1} aria-label={prevLabel ? undefined : 'Prethodna strana'}>{prevLabel}</Btn>
        <span className="mx-tech-mpager__text">{text}</span>
        <Btn icon={nextLabel ? undefined : ChevronRight} iconRight={nextLabel ? ChevronRight : undefined} onClick={() => onPage(page + 1)} disabled={page === pages} aria-label={nextLabel ? undefined : 'Sledeća strana'}>{nextLabel}</Btn>
      </div>
    </div>
  );
}

export function PagePager({ page, pages, onPage, text }) {
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <nav className="mx-pager" aria-label="Stranice">
      <span className="mx-pager__text">{text}</span>
      <span className="mx-pager__btns">
        <Btn size="sm" variant="ghost" icon={ChevronsLeft} onClick={() => onPage(1)} disabled={page === 1} aria-label="Prva strana" />
        <Btn size="sm" variant="ghost" icon={ChevronLeft} onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Prethodna strana" />
        {nums.map((n) => (
          <Btn key={n} size="sm" variant={n === page ? 'primary' : 'ghost'} onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined} className="mx-pager__num">{n}</Btn>
        ))}
        <Btn size="sm" variant="ghost" icon={ChevronRight} onClick={() => onPage(page + 1)} disabled={page === pages} aria-label="Sledeća strana" />
        <Btn size="sm" variant="ghost" icon={ChevronsRight} onClick={() => onPage(pages)} disabled={page === pages} aria-label="Poslednja strana" />
      </span>
    </nav>
  );
}
