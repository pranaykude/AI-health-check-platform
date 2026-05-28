import { useState, useEffect, useRef } from "react";

const COLS = 5, ROWS = 7, CELL = 7, GAP = 2, STEP = CELL + GAP;
const TOTAL = COLS * ROWS;
const SNAKE_LEN = 10;

const DIGITS = {
  0:[0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  1:[0,0,1,0,0, 0,1,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,1,1,1,0],
  2:[0,1,1,1,0, 1,0,0,0,1, 0,0,0,0,1, 0,0,0,1,0, 0,0,1,0,0, 0,1,0,0,0, 1,1,1,1,1],
  3:[1,1,1,1,0, 0,0,0,0,1, 0,0,0,0,1, 0,1,1,1,0, 0,0,0,0,1, 0,0,0,0,1, 1,1,1,1,0],
  4:[1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,1,1,1,1, 0,0,0,0,1, 0,0,0,0,1, 0,0,0,0,1],
  5:[1,1,1,1,1, 1,0,0,0,0, 1,0,0,0,0, 1,1,1,1,0, 0,0,0,0,1, 0,0,0,0,1, 1,1,1,1,0],
  6:[0,1,1,1,0, 1,0,0,0,0, 1,0,0,0,0, 1,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  7:[1,1,1,1,1, 0,0,0,0,1, 0,0,0,1,0, 0,0,1,0,0, 0,1,0,0,0, 0,1,0,0,0, 0,1,0,0,0],
  8:[0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  9:[0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,1, 0,0,0,0,1, 0,0,0,0,1, 0,1,1,1,0],
};

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getLit(d) {
  return [...Array(TOTAL).keys()].filter(i => DIGITS[d][i] === 1);
}

function getNeighbors(pos) {
  const r = Math.floor(pos / COLS), c = pos % COLS, n = [];
  if (r > 0) n.push(pos - COLS);
  if (r < ROWS - 1) n.push(pos + COLS);
  if (c > 0) n.push(pos - 1);
  if (c < COLS - 1) n.push(pos + 1);
  return n;
}

function SnakeCanvas({ digit, theme }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const frameRef = useRef(0);

  // init or reinit when digit changes
  useEffect(() => {
    const lit = getLit(digit);
    const head = lit[0] ?? 0;
    stateRef.current = { pos: head, trail: [head], lit, digit };
  }, [digit]);

  useEffect(() => {
    function step() {
      const s = stateRef.current;
      if (!s) return;
      const nb = getNeighbors(s.pos);
      const onLit = nb.filter(n => s.lit.includes(n));
      const fresh = onLit.filter(n => !s.trail.slice(-4).includes(n));
      const pool = fresh.length ? fresh : onLit.length ? onLit : nb;
      const next = pool[Math.floor(Math.random() * pool.length)];
      if (next === undefined) return;
      s.trail.push(next);
      if (s.trail.length > SNAKE_LEN) s.trail.shift();
      s.pos = next;
    }

    function draw() {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      const W = cv.width, H = cv.height;
      const s = stateRef.current;
      if (!s) return;

      ctx.clearRect(0, 0, W, H);

      const offX = (W - (COLS * STEP - GAP)) / 2;
      const offY = (H - (ROWS * STEP - GAP)) / 2;

      const isDark = theme === 'dark';
      // draw grid cells
      for (let i = 0; i < TOTAL; i++) {
        const r = Math.floor(i / COLS), c = i % COLS;
        const x = offX + c * STEP, y = offY + r * STEP;
        ctx.fillStyle = DIGITS[s.digit][i] === 1
          ? (isDark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.15)')
          : (isDark ? 'rgba(255,255,255,0.03)' : '#f1f5f9');
        ctx.beginPath();
        ctx.roundRect(x, y, CELL, CELL, 2);
        ctx.fill();
      }

      // draw snake trail
      s.trail.forEach((cell, idx) => {
        const r = Math.floor(cell / COLS), c = cell % COLS;
        const x = offX + c * STEP, y = offY + r * STEP;
        const t = (idx + 1) / s.trail.length;
        const isHead = idx === s.trail.length - 1;

        if (isHead) {
          // head
          ctx.fillStyle = isDark ? '#4ade80' : '#16a34a';
          ctx.beginPath();
          ctx.roundRect(x, y, CELL, CELL, 2);
          ctx.fill();

          // eyes based on direction
          const dir = s.trail.length > 1 ? s.pos - s.trail[s.trail.length - 2] : 1;
          ctx.fillStyle = isDark ? '#0a0e1a' : '#ffffff';
          if (dir === 1) {
            ctx.fillRect(x + CELL - 3, y + 1, 2, 2);
            ctx.fillRect(x + CELL - 3, y + CELL - 3, 2, 2);
          } else if (dir === -1) {
            ctx.fillRect(x + 1, y + 1, 2, 2);
            ctx.fillRect(x + 1, y + CELL - 3, 2, 2);
          } else if (dir === COLS) {
            ctx.fillRect(x + 1, y + CELL - 3, 2, 2);
            ctx.fillRect(x + CELL - 3, y + CELL - 3, 2, 2);
          } else {
            ctx.fillRect(x + 1, y + 1, 2, 2);
            ctx.fillRect(x + CELL - 3, y + 1, 2, 2);
          }
        } else {
          // body with fade
          const shrink = (1 - t) * 1.5;
          ctx.fillStyle = isDark 
            ? `rgba(74,222,128,${t * 0.55})`
            : `rgba(22,163,74,${t * 0.55})`;
          ctx.beginPath();
          ctx.roundRect(x + shrink, y + shrink, CELL - shrink * 2, CELL - shrink * 2, 2);
          ctx.fill();
        }
      });
    }

    function loop() {
      frameRef.current++;
      if (frameRef.current % 2 === 0) {
        // sync lit cells with current digit prop
        if (stateRef.current) {
          stateRef.current.lit = getLit(digit);
          stateRef.current.digit = digit;
        }
        step();
        draw();
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [digit, theme]);

  return <canvas ref={canvasRef} width={44} height={60} />;
}

function ColonDivider({ theme }) {
  const isDark = theme === 'dark';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 14 }}>
      {[0, 1].map(i => (
        <div key={i} style={{
          width: 4, height: 4, borderRadius: '50%', background: isDark ? '#4ade80' : '#126208',
          animation: 'blink 1s step-start infinite',
        }} />
      ))}
    </div>
  );
}

export default function ExecutionOverview({ theme = 'light' }) {
  const isDark = theme === 'dark';

  const colors = {
    bg: isDark ? '#0a0e1a' : '#ffffff',
    border: isDark ? '0.5px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
    headerText: isDark ? 'rgba(255,255,255,0.4)' : '#64748b',
    activeBg: isDark ? 'rgba(74,222,128,0.12)' : '#dcfce7',
    activeText: isDark ? '#4ade80' : '#126208',
    digitLabel: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8',
    metaBg: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    metaBorder: isDark ? '0.5px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
    metaLabel: isDark ? 'rgba(255,255,255,0.3)' : '#64748b',
    metaValue: isDark ? 'rgba(255,255,255,0.8)' : '#0f172a',
    statusBorder: isDark ? '0.5px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0',
    statusText: isDark ? 'rgba(255,255,255,0.3)' : '#64748b',
  };
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const digits = [
    Math.floor(h / 10), h % 10,
    Math.floor(m / 10), m % 10,
    Math.floor(s / 10), s % 10,
  ];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ');

  return (
    <>
      {/* inject blink keyframes once */}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.1}} @keyframes pp{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>

      <div style={{
        background: colors.bg,
        borderRadius: 16,
        border: colors.border,
        padding: 20,
        maxWidth: 480,
        width: '100%',
        margin: '0 auto',
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 10, fontWeight: 500, color: colors.headerText, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Execution overview
          </span>
          <span style={{ fontSize: 10, color: colors.activeText, background: colors.activeBg, padding: '3px 10px', borderRadius: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.activeText, animation: 'pp 2s ease-in-out infinite', display: 'inline-block' }} />
            Session active
          </span>
        </div>

        {/* snake digits */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
          {[[0, 1], [2, 3], [4, 5]].map((pair, gi) => (
            <div key={gi} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {pair.map(i => <SnakeCanvas key={i} digit={digits[i]} theme={theme} />)}
                </div>
                <span style={{ fontSize: 9, color: colors.digitLabel, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {['HH', 'MM', 'SS'][gi]}
                </span>
              </div>
              {gi < 2 && <ColonDivider theme={theme} />}
            </div>
          ))}
        </div>

        {/* meta row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            ['Day', DAYS[now.getDay()]],
            ['Date', `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`],
            ['Timezone', tz],
          ].map(([label, value]) => (
            <div key={label} style={{ background: colors.metaBg, borderRadius: 10, padding: '9px 11px', border: colors.metaBorder }}>
              <div style={{ fontSize: 9, fontWeight: 500, color: colors.metaLabel, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: colors.metaValue, marginTop: 3 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', border: colors.statusBorder, borderRadius: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.activeText, animation: 'pp 2s ease-in-out infinite', marginTop: 3, flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: colors.statusText, lineHeight: 1.6 }}>
            Platform operating within normal parameters. Real-time stats reflect calls processed in the current session.
          </div>
        </div>
      </div>
    </>
  );
}
