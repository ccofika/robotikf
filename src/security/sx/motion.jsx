// Gradivni blokovi za kretanje (framer-motion), iste krive kao CSS tokeni u sx.css.
// Pravila: ulaz ide brzo pa usporava (expo-out), površine koje se pomeraju ease-in-out,
// providnost uvek linearno, stagger mali, sa "smanjenim kretanjem" ostaje samo kratko pretapanje.
import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, animate } from 'framer-motion';

export const EASE_OUT = [0.16, 1, 0.3, 1];
export const EASE_MOVE = [0.7, 0, 0.3, 1];
export const EASE_EXIT = [0.36, 0, 0.66, 0];
export const EASE_POP = [0.34, 1.56, 0.64, 1];
export const EASE_QUINT = [0.86, 0, 0.07, 1];

// Element izroni: providnost linearno 200 ms, pomeraj expo-out
export function Reveal({ as = 'div', delay = 0, y = 12, duration = 0.5, className, children, ...rest }) {
  const reduce = useReducedMotion();
  const Comp = motion[as] || motion.div;
  return (
    <Comp
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0.15 } : { opacity: { duration: 0.2, delay, ease: 'linear' }, y: { duration, delay, ease: EASE_OUT } }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

// Naslov čije reči izranjaju iz maske (svaka reč u sopstvenom prozoru), bez pretapanja
export function SplitReveal({ text, as = 'h1', className, delay = 0, stagger = 0.03, duration = 0.6, ...rest }) {
  const reduce = useReducedMotion();
  const Comp = as;
  const words = String(text).split(' ');
  if (reduce) return <Comp className={className} {...rest}>{text}</Comp>;
  return (
    <Comp className={className} aria-label={text} {...rest}>
      {words.map((word, i) => (
        <React.Fragment key={`${word}-${i}`}>
          <span aria-hidden="true" className="sx-split">
            <motion.span
              style={{ display: 'inline-block', willChange: 'transform' }}
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration, delay: delay + i * stagger, ease: EASE_OUT }}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </Comp>
  );
}

// Brojka koja odbrojava do vrednosti; pri svakoj promeni kreće od prethodne vrednosti
export function CountUp({ value, duration = 0.9, delay = 0, format, className }) {
  const reduce = useReducedMotion();
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(reduce ? target : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce) { setDisplay(target); from.current = target; return undefined; }
    const controls = animate(from.current, target, { duration, delay, ease: EASE_OUT, onUpdate: (v) => setDisplay(v) });
    from.current = target;
    return () => controls.stop();
  }, [target, duration, delay, reduce]);
  const text = format ? format(display) : Math.round(display).toLocaleString('sr-Latn-RS');
  return <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>{text}</span>;
}

// Tekst koji se na hover okrene slovo po slovo; druga kopija slova je CSS ::after (tekst je u DOM-u jednom)
export function RollText({ text, className = '' }) {
  const letters = Array.from(String(text));
  return (
    <span className={`sx-roll ${className}`}>
      {letters.map((ch, i) => (
        <span key={i} className="sx-roll__ch" style={{ '--i': i }}>
          <span className="sx-roll__in" data-ch={ch}>{ch}</span>
        </span>
      ))}
    </span>
  );
}

// Nova stranica samo ulazi (bez izlaza), da navigacija nikad ne čeka
export function PageEnter({ routeKey, children, className }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={routeKey}
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0.12 } : { opacity: { duration: 0.18, ease: 'linear' }, y: { duration: 0.32, ease: EASE_OUT } }}
    >
      {children}
    </motion.div>
  );
}
