// Zajednički delovi Montaže koje Security nema (duge liste): paginacija, izbor kolona, učitavanje.
// Izgled je iz sx- klasa i tokena; stil dodataka je u montaza.css (mx-).
import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Link } from 'react-router-dom';
import { Columns3, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { cx, Btn, Skeleton } from '../security/sx/ui';
import { Checkbox } from '../security/sx/forms';

// Link koji izgleda kao dugme (umesto <Link><Button/></Link>): iste varijante i veličine kao Btn
export const LinkBtn = React.forwardRef(function LinkBtn({ to, variant = 'secondary', size, icon: Icon, iconRight: IconRight, className, children, ...rest }, ref) {
  const cls = cx('sx-btn sx-fill', variant !== 'secondary' && `sx-btn--${variant}`, size && `sx-btn--${size}`, !children && Icon && 'sx-btn--icon', className);
  return (
    <Link ref={ref} to={to} className={cls} {...rest}>
      {Icon ? <Icon aria-hidden="true" strokeWidth={1.9} /> : null}
      {children}
      {IconRight ? <IconRight aria-hidden="true" strokeWidth={1.9} /> : null}
    </Link>
  );
});

// Paginacija: "Prikazano 1 - 20 od 45 rezultata" + prva, prethodna, brojevi (prva, poslednja, ±1), sledeća, poslednja
export function Pager({ page, total, perPage, onPage, className, label = 'rezultata', testId }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <nav className={cx('mx-pager', className)} aria-label="Stranice" data-testid={testId}>
      <span className="mx-pager__text">Prikazano {first} - {last} od {total} {label}</span>
      <span className="mx-pager__btns">
        <Btn size="sm" variant="ghost" icon={ChevronsLeft} onClick={() => onPage(1)} disabled={page === 1} aria-label="Prva strana" />
        <Btn size="sm" variant="ghost" icon={ChevronLeft} onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Prethodna strana" />
        {nums.map((n, i) => (
          <React.Fragment key={n}>
            {i > 0 && n - nums[i - 1] > 1 && <span className="mx-pager__gap" aria-hidden="true">...</span>}
            <Btn size="sm" variant={n === page ? 'primary' : 'ghost'} onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined} className="mx-pager__num">{n}</Btn>
          </React.Fragment>
        ))}
        <Btn size="sm" variant="ghost" icon={ChevronRight} onClick={() => onPage(page + 1)} disabled={page === pages} aria-label="Sledeća strana" />
        <Btn size="sm" variant="ghost" icon={ChevronsRight} onClick={() => onPage(pages)} disabled={page === pages} aria-label="Poslednja strana" />
      </span>
    </nav>
  );
}

// Izbor kolona: dugme "Kolone" i spisak sa štikliranjem (columns = { ključ: 'Naziv' })
export function ColumnMenu({ columns, visible, onChange, label = 'Kolone', title = 'Prikaži kolone' }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Btn size="sm" icon={Columns3}>{label}</Btn>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="sx-portal sx-popover mx-colmenu" align="end" sideOffset={6} collisionPadding={12}>
          <span className="sx-label">{title}</span>
          <div className="mx-colmenu__list">
            {Object.entries(columns).map(([key, name]) => (
              <Checkbox key={key} checked={!!visible[key]} onChange={(v) => onChange(key, v)}>{name}</Checkbox>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Učitavanje liste: nekoliko redova "kostura" i tekst za čitače ekrana
export function Loading({ rows = 4, text = 'Učitavanje...', h = 44 }) {
  return (
    <div className="mx-loading" role="status" aria-live="polite">
      <span className="sx-sr">{text}</span>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} h={h} />)}
    </div>
  );
}
