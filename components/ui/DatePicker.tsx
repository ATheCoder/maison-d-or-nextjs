'use client';
/**
 * DatePicker — the one date control for Maison d'Oré.
 *
 * It replaces `<input type="date">`, whose look is the browser's and not ours:
 * a slate-grey Chrome dialog in the middle of an ivory-and-gold wizard, a
 * different shape again on Safari and Firefox, and on some Linux builds no
 * calendar at all. This one is the same everywhere and matches the house.
 *
 * The value is a day key — 'YYYY-MM-DD', or '' for empty — so it is a drop-in
 * for the native control it replaces: same `value`/`onChange`/`min`/`max`, and
 * the same string arriving at the server action.
 *
 *   <label htmlFor="birthDate">The day they were born</label>
 *   <DatePicker id="birthDate" value={birthDate} onChange={setBirthDate}
 *               min={bounds.min} max={bounds.max} />
 *
 * Two halves, both of which must work on their own:
 *
 *  · The field is a real text box. Typing 04/03/2016 — or 4/3/2016, or 4.3.2016,
 *    or 04032016, or the ISO 2016-03-04 — is by far the fastest way to enter a
 *    date years in the past, and a calendar that forces twelve clicks per year
 *    is the reason people hate date pickers. Separators are inserted as you
 *    type, and the text is tidied to DD/MM/YYYY on blur.
 *  · The calendar is a proper ARIA grid: arrows move a day, PageUp/PageDown a
 *    month, with Shift a year, Home/End the week, Enter picks, Escape closes,
 *    and the caption carries month and year controls so no one has to walk
 *    backwards month by month.
 *
 * Shape follows the viewport, not the pointer: a popover anchored to the field
 * on tablets and desks, a bottom sheet with a scrim on phones, where an
 * anchored popover would sit under the thumb and off the screen edge. Both are
 * portalled to <body> at a fixed position, so no `overflow: hidden` ancestor
 * can clip them. All of the styling lives in `app/globals.css` under
 * "MAISON DATE PICKER".
 *
 * Bounds are advisory to the keyboard and binding to the mouse: days outside
 * [min, max] cannot be clicked, but a typed date outside them is still reported
 * to the caller, because the caller owns the message that explains why it is
 * wrong (`normalizeBirthDate` writes a better one than a greyed-out cell does).
 */
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { parseDayKey, toDayKey, todayKey, type DayKey } from '@/lib/day-key';
import {
  formatTypedDate,
  maskTypedDate,
  parseTypedDate,
  typedDateMonth,
  typedDateProblem,
} from '@/lib/typed-date';

export type DatePickerProps = {
  /** 'YYYY-MM-DD', or '' when nothing is chosen yet. */
  value: string;
  /** Called with a day key, or '' whenever the field does not hold a real date. */
  onChange: (value: string) => void;
  /** Inclusive bounds, as day keys — the same meaning as on `<input type="date">`. */
  min?: string;
  max?: string;
  /** Goes on the text box, so a `<label htmlFor>` points at the thing you type in. */
  id?: string;
  /** Set to also submit the value inside a plain `<form>`. */
  name?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Draw the field as wrong. The caller decides what "wrong" means; unparseable text is always drawn as wrong. */
  invalid?: boolean;
  placeholder?: string;
  /** e.g. 'bday' on a birthday field, so the browser can offer what it knows. */
  autoComplete?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  /** Width and margins for the wrapper; the field always fills it. */
  style?: React.CSSProperties;
  className?: string;
  /** 1 = Monday (the default, as the rest of the app's en-GB dates), 0 = Sunday. */
  weekStartsOn?: 0 | 1;
};

/**
 * The widest range the calendar will offer when a caller sets no bounds.
 * The floor is year 1000 rather than year 1 on purpose: `Date.UTC` maps years
 * 0–99 onto 1900–1999, which would make `parseDayKey` reject its own output.
 */
const FLOOR: DayKey = '1000-01-01';
const CEIL: DayKey = '2999-12-31';

/** Above this many years the year control stops being a select and becomes a box you type in. */
const MAX_YEARS_IN_SELECT = 200;

const MONTHS_LONG = Array.from({ length: 12 }, (_, m) =>
  new Date(Date.UTC(2001, m, 1)).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })
);

/** Indexed by `getUTCDay()`, so 0 is Sunday — 2001-01-07 was one. */
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(Date.UTC(2001, 0, 7 + i));
  return {
    short: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
    long: d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }),
  };
});

const fullDate = (key: DayKey) => {
  const p = parseDayKey(key);
  if (!p) return '';
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
};

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const shiftDays = (key: DayKey, delta: number): DayKey => {
  const p = parseDayKey(key)!;
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + delta));
  return toDayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
};

/** Same day of the month in another month, pulled back to the last day when it does not exist (31 March → 28 February). */
const shiftMonths = (key: DayKey, delta: number): DayKey => {
  const p = parseDayKey(key)!;
  const total = (p.year * 12) + (p.month - 1) + delta;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return toDayKey(year, month, Math.min(p.day, daysInMonth(year, month)));
};

/** Day keys are fixed-width, so string order is calendar order. */
const clampKey = (key: DayKey, min: DayKey, max: DayKey) => (key < min ? min : key > max ? max : key);

/** The day halfway between two others — where an empty picker opens when today is out of bounds. */
const midpoint = (a: DayKey, b: DayKey): DayKey => {
  const at = Date.UTC(parseDayKey(a)!.year, parseDayKey(a)!.month - 1, parseDayKey(a)!.day);
  const bt = Date.UTC(parseDayKey(b)!.year, parseDayKey(b)!.month - 1, parseDayKey(b)!.day);
  const d = new Date(at + Math.floor((bt - at) / 2));
  return toDayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
};

/**
 * Phone or not — asked of the viewport rather than the pointer, because the
 * question the answer decides is "is there room to hang a 320px panel off this
 * field", and a narrow window on a desk has the same answer as a phone.
 *
 * Read through useSyncExternalStore so the server render and the hydration
 * render agree on `false` (the same reason the wizard reads its timezone this
 * way) and only the pass after hydration can see a sheet.
 */
const SHEET_QUERY = '(max-width: 559px)';
const subscribeSheet = (onChange: () => void) => {
  const mq = window.matchMedia(SHEET_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const readSheet = () => window.matchMedia(SHEET_QUERY).matches;
const noSheetOnServer = () => false;

export default function DatePicker({
  value,
  onChange,
  min: minProp,
  max: maxProp,
  id,
  name,
  disabled = false,
  autoFocus = false,
  invalid = false,
  placeholder = 'DD / MM / YYYY',
  autoComplete,
  style,
  className,
  weekStartsOn = 1,
  ...aria
}: DatePickerProps) {
  const min = parseDayKey(minProp) ? (minProp as DayKey) : FLOOR;
  const max = parseDayKey(maxProp) && (maxProp as DayKey) >= min ? (maxProp as DayKey) : CEIL;

  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef(new Map<DayKey, HTMLButtonElement>());

  const isSheet = useSyncExternalStore(subscribeSheet, readSheet, noSheetOnServer);

  /**
   * The month an empty calendar opens on. Today, when today is allowed —
   * otherwise the middle of the caller's range rather than the near edge of
   * it: a birthday picker bounded to ages 5–17 that opened on its own boundary
   * would show a month with one clickable day in it, which reads as broken.
   * The midpoint is a month where nearly everything can be clicked (and, for a
   * child, a plausible eleven-year-old).
   */
  const startDay = useCallback(() => {
    const t = todayKey();
    if (t >= min && t <= max) return t;
    return min !== FLOOR && max !== CEIL ? midpoint(min, max) : clampKey(t, min, max);
  }, [min, max]);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => formatTypedDate(value));
  const [focusedDay, setFocusedDay] = useState<DayKey>(
    () => (value && parseDayKey(value) ? clampKey(value, min, max) : startDay())
  );

  /**
   * Shut the calendar whenever this leaves the screen.
   *
   * Under Cache Components <Activity> hides a route instead of unmounting it,
   * so an open panel comes back open on a page the reader has just navigated
   * to — and this one is a fixed-position overlay placed against a
   * getBoundingClientRect taken before they left, so it comes back open *and*
   * in the wrong place. The typed `text` is kept: that is the reader's answer,
   * and preserving it is the point of Activity. Only the transient panel goes.
   */
  useLayoutEffect(() => () => setOpen(false), []);

  /**
   * The last value this component handed out. Incoming `value` is only allowed
   * to rewrite the text box when it differs from that — otherwise every
   * keystroke that does not yet parse (and so reports '') would bounce back as
   * a prop change and erase what is being typed.
   */
  const emitted = useRef(value);
  const emit = useCallback((next: string) => {
    if (next === emitted.current) return;
    emitted.current = next;
    onChange(next);
  }, [onChange]);

  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    setText(formatTypedDate(value));
  }, [value]);

  const problem = typedDateProblem(text);
  const showInvalid = invalid || problem != null;
  const describedBy = [aria['aria-describedby'], problem ? `${panelId}-note` : null].filter(Boolean).join(' ');

  const view = useMemo(() => {
    const p = parseDayKey(focusedDay)!;
    return { year: p.year, month: p.month };
  }, [focusedDay]);

  /** Focus is moved to a day only when the grid itself asked for it — never when the month came from a select. */
  const wantsGridFocus = useRef(false);

  const openPanel = useCallback(() => {
    if (disabled) return;
    // Half-written text still steers the calendar: '31/02/2016' does not exist,
    // but it says February 2016, which is where the mistake is best corrected.
    setFocusedDay(
      value && parseDayKey(value)
        ? clampKey(value, min, max)
        : clampKey(typedDateMonth(text) ?? startDay(), min, max)
    );
    wantsGridFocus.current = true;
    setOpen(true);
  }, [disabled, value, min, max, text, startDay]);

  const closePanel = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) inputRef.current?.focus();
  }, []);

  const pick = useCallback((key: DayKey) => {
    setText(formatTypedDate(key));
    emit(key);
    closePanel();
  }, [emit, closePanel]);

  // ── The text box ──────────────────────────────────────────────────────────

  /**
   * Every keystroke reports: a real date, or '' for anything short of one. The
   * caller's validation then never runs against a half-typed day, and the
   * field is free to keep showing text that does not parse yet.
   */
  function handleInput(raw: string) {
    const next = maskTypedDate(text, raw);
    setText(next);
    emit(parseTypedDate(next) ?? '');
  }

  /** Leaving tidies a date that was understood; text that was not is left alone to be corrected. */
  function handleBlur() {
    const parsed = parseTypedDate(text);
    if (parsed) setText(formatTypedDate(parsed));
    else if (text !== text.trim()) setText(text.trim());
  }

  /** Down opens the calendar, as it does on a native date field and on a select. Escape is handled for the whole document while the panel is open. */
  function handleFieldKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' && !open) {
      e.preventDefault();
      openPanel();
    }
  }

  // ── Living with the panel: outside clicks, Escape, scroll lock ────────────

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || wrapRef.current?.contains(t)) return;
      closePanel(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      closePanel();
    };
    // A popover closes when focus walks out of it; a sheet keeps focus inside
    // (the Tab trap below), so it has nothing to react to here.
    const onFocusIn = (e: FocusEvent) => {
      if (isSheet) return;
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || wrapRef.current?.contains(t)) return;
      closePanel(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn, true);
    };
  }, [open, isSheet, closePanel]);

  useEffect(() => {
    if (!open || !isSheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open, isSheet]);

  // ── Where the popover goes ────────────────────────────────────────────────

  /**
   * The panel is `position: fixed` in a portal — nothing can clip it, but
   * nothing places it either, so it is measured against the field and told
   * where to sit. Written straight to the node rather than held in state: this
   * runs on every scroll frame, and a re-render per frame to move a box is a
   * cost with nothing to show for it.
   *
   * A layout effect, so the move lands before the browser paints; the panel is
   * rendered hidden and revealed here, which is what stops it appearing at the
   * top-left corner for a frame.
   */
  useLayoutEffect(() => {
    if (!open || isSheet) return;

    const place = () => {
      const anchor = wrapRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const r = anchor.getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - 16);
      panel.style.width = `${width}px`;
      const height = panel.offsetHeight || 340;
      const roomBelow = window.innerHeight - r.bottom;
      // Below the field, unless it will not fit there and there is genuinely
      // more room above.
      const above = roomBelow < height + 8 && r.top - 8 > roomBelow;
      panel.style.top = `${above ? Math.max(8, r.top - height - 6) : r.bottom + 6}px`;
      panel.style.left = `${Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - width - 8))}px`;
      panel.style.visibility = 'visible';
    };

    place();
    window.addEventListener('resize', place);
    // Capture, so the panel follows a field inside any scrolling container.
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
    // The month changes the panel's height, which can change which side of the
    // field it belongs on.
  }, [open, isSheet, view.year, view.month]);

  // The grid takes focus after it is on screen, and only when it asked to.
  useEffect(() => {
    if (!open || !wantsGridFocus.current) return;
    wantsGridFocus.current = false;
    dayRefs.current.get(focusedDay)?.focus();
  }, [open, focusedDay]);

  // ── The month being shown ─────────────────────────────────────────────────

  const grid = useMemo(() => {
    const { year, month } = view;
    const total = daysInMonth(year, month);
    const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const lead = (firstDow - weekStartsOn + 7) % 7;
    const cells: Array<DayKey | null> = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= total; d++) cells.push(toDayKey(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: Array<Array<DayKey | null>> = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [view, weekStartsOn]);

  const weekdays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => WEEKDAYS[(i + weekStartsOn) % 7]),
    [weekStartsOn]
  );

  const today = todayKey();
  const minYear = parseDayKey(min)!.year;
  const maxYear = parseDayKey(max)!.year;
  const yearsFitSelect = maxYear - minYear <= MAX_YEARS_IN_SELECT;

  const canStepMonth = (delta: number) => {
    const { year, month } = view;
    const total = (year * 12) + (month - 1) + delta;
    const y = Math.floor(total / 12);
    const m = (total % 12) + 1;
    return delta < 0 ? toDayKey(y, m, daysInMonth(y, m)) >= min : toDayKey(y, m, 1) <= max;
  };

  /** Move the month without moving the selection: the focused day rides along, clamped into what exists and what is allowed. */
  const goToMonth = (year: number, month: number) => {
    const day = Math.min(parseDayKey(focusedDay)!.day, daysInMonth(year, month));
    setFocusedDay(clampKey(toDayKey(year, month, day), min, max));
  };

  const stepMonth = (delta: number) => {
    const moved = shiftMonths(focusedDay, delta);
    const p = parseDayKey(moved)!;
    goToMonth(p.year, p.month);
  };

  function handleGridKeyDown(e: React.KeyboardEvent) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next: DayKey | null = null;

    if (e.key in moves) {
      next = shiftDays(focusedDay, moves[e.key]);
    } else if (e.key === 'Home' || e.key === 'End') {
      const p = parseDayKey(focusedDay)!;
      const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
      const intoWeek = (dow - weekStartsOn + 7) % 7;
      next = shiftDays(focusedDay, e.key === 'Home' ? -intoWeek : 6 - intoWeek);
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      const back = e.key === 'PageUp';
      next = shiftMonths(focusedDay, (e.shiftKey ? 12 : 1) * (back ? -1 : 1));
    } else {
      return;
    }

    e.preventDefault();
    wantsGridFocus.current = true;
    setFocusedDay(clampKey(next, min, max));
  }

  /** Tab stays inside the sheet — it covers the page, so there is nothing behind it to reach. */
  function handlePanelKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !isSheet) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const panel = (
    <>
      {isSheet && <div className="mdo-dp-scrim" onClick={() => closePanel(false)} aria-hidden="true" />}
      <div
        ref={panelRef}
        id={panelId}
        className="mdo-dp-panel"
        data-mode={isSheet ? 'sheet' : 'pop'}
        role="dialog"
        aria-modal={isSheet || undefined}
        aria-label="Choose a date"
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        style={isSheet ? undefined : { top: 0, left: 0, visibility: 'hidden' }}
      >
        {isSheet && <div className="mdo-dp-grab" aria-hidden="true" />}

        <div className="mdo-dp-cap">
          <button
            type="button"
            className="mdo-dp-arrow"
            onClick={() => stepMonth(-1)}
            disabled={!canStepMonth(-1)}
            aria-label="Previous month"
          >
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none" aria-hidden="true">
              <path d="M7 1L1.5 6.5L7 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="mdo-dp-caps">
            <select
              className="mdo-dp-select"
              value={view.month}
              onChange={(e) => goToMonth(view.year, Number(e.target.value))}
              aria-label="Month"
            >
              {MONTHS_LONG.map((label, i) => (
                <option
                  key={label}
                  value={i + 1}
                  disabled={toDayKey(view.year, i + 1, daysInMonth(view.year, i + 1)) < min || toDayKey(view.year, i + 1, 1) > max}
                >
                  {label}
                </option>
              ))}
            </select>

            {yearsFitSelect ? (
              <select
                className="mdo-dp-select"
                value={view.year}
                onChange={(e) => goToMonth(Number(e.target.value), view.month)}
                aria-label="Year"
              >
                {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            ) : (
              <input
                className="mdo-dp-year"
                type="text"
                inputMode="numeric"
                maxLength={4}
                defaultValue={view.year}
                key={view.year}
                aria-label="Year"
                onChange={(e) => {
                  const y = Number(e.target.value.replace(/\D/g, ''));
                  if (e.target.value.length === 4 && y >= minYear && y <= maxYear) goToMonth(y, view.month);
                }}
              />
            )}
          </div>

          <button
            type="button"
            className="mdo-dp-arrow"
            onClick={() => stepMonth(1)}
            disabled={!canStepMonth(1)}
            aria-label="Next month"
          >
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none" aria-hidden="true">
              <path d="M1 1L6.5 6.5L1 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div
          className="mdo-dp-grid"
          role="grid"
          aria-label={`${MONTHS_LONG[view.month - 1]} ${view.year}`}
          onKeyDown={handleGridKeyDown}
        >
          <div className="mdo-dp-row" role="row">
            {weekdays.map((w) => (
              <span key={w.long} className="mdo-dp-wd" role="columnheader" aria-label={w.long}>
                {w.short.slice(0, 2)}
              </span>
            ))}
          </div>

          {grid.map((week, wi) => (
            <div className="mdo-dp-row" role="row" key={wi}>
              {week.map((key, di) => {
                if (!key) return <span className="mdo-dp-cell" role="gridcell" aria-hidden="true" key={`${wi}-${di}`} />;
                const outOfRange = key < min || key > max;
                const selected = key === value;
                return (
                  <span className="mdo-dp-cell" role="gridcell" aria-selected={selected} key={key}>
                    <button
                      type="button"
                      className="mdo-dp-day"
                      ref={(el) => {
                        if (el) dayRefs.current.set(key, el);
                        else dayRefs.current.delete(key);
                      }}
                      tabIndex={key === focusedDay ? 0 : -1}
                      disabled={outOfRange}
                      aria-current={key === today ? 'date' : undefined}
                      data-selected={selected}
                      data-today={key === today}
                      aria-label={fullDate(key)}
                      onClick={() => pick(key)}
                      onFocus={() => setFocusedDay(key)}
                    >
                      {parseDayKey(key)!.day}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mdo-dp-foot">
          <span className="mdo-dp-chosen">
            {value && parseDayKey(value) ? fullDate(value) : 'No date chosen yet'}
          </span>
          {value !== '' && (
            <button
              type="button"
              className="mdo-dp-quiet"
              onClick={() => { setText(''); emit(''); inputRef.current?.focus(); }}
            >
              Clear
            </button>
          )}
          {isSheet && (
            <button type="button" className="mdo-dp-done" onClick={() => closePanel()}>Done</button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div ref={wrapRef} className={className ? `mdo-dp ${className}` : 'mdo-dp'} style={style}>
      <div className="mdo-dp-field" data-invalid={showInvalid} data-disabled={disabled}>
        <input
          ref={inputRef}
          id={id}
          className="mdo-dp-input"
          type="text"
          inputMode="numeric"
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={text}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(e) => handleInput(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleFieldKeyDown}
          aria-label={aria['aria-label']}
          aria-describedby={describedBy || undefined}
          aria-invalid={showInvalid || undefined}
        />
        <button
          type="button"
          className="mdo-dp-open"
          onClick={() => (open ? closePanel() : openPanel())}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={open ? 'Close calendar' : 'Open calendar'}
        >
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect x="1.75" y="3.25" width="14.5" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M1.75 7.25h14.5M5.75 1.75v3M12.25 1.75v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="9" cy="11.25" r="1.15" fill="currentColor" />
          </svg>
        </button>
      </div>

      {problem && (
        <p className="mdo-dp-note" id={`${panelId}-note`} role="alert">{problem}</p>
      )}

      {name && <input type="hidden" name={name} value={value} />}

      {open && typeof document !== 'undefined' && createPortal(panel, document.body)}
    </div>
  );
}
