import { useState, useEffect, useRef } from 'react';
import './CookMode.css';
import { Icon } from './DesignTokens';

function TimerSetup({ onStart }) {
  const [minutes, setMinutes] = useState(5);
  return (
    <>
      <div className="timer-panel-label">Timer einstellen</div>
      <div className="timer-controls">
        <button className="timer-adj-btn" onClick={() => setMinutes(m => Math.max(1, m - 1))}>
          <Icon name="minus" size={18} color="#F9FBF8" />
        </button>
        <div className="timer-display">{minutes}</div>
        <button className="timer-adj-btn" onClick={() => setMinutes(m => Math.min(99, m + 1))}>
          <Icon name="plus" size={18} color="#F9FBF8" />
        </button>
      </div>
      <div className="timer-presets">
        {[1, 5, 10, 15].map(m => (
          <button key={m} className="timer-preset-btn"
            onClick={() => setMinutes(m)}
            style={{ fontWeight: minutes === m ? 700 : 400 }}>
            {m} Min
          </button>
        ))}
      </div>
      <button className="timer-start-btn" onClick={() => onStart(minutes)}>
        Starten
      </button>
    </>
  );
}

export default function CookMode({ recipe, onClose }) {
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState([]);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showTimerSetup, setShowTimerSetup] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);

  const wakeLockRef = useRef(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const timerIntervalRef = useRef(null);
  const endTimeRef = useRef(null); // feste Endzeit → Restzeit bleibt auch nach Hintergrund korrekt
  const audioCtxRef = useRef(null);
  const plingFiredRef = useRef(false);

  useEffect(() => {
    const acquire = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
          wakeLockRef.current.addEventListener('release', () => setWakeLockActive(false));
        } catch (e) { }
      }
    };
    acquire();
    return () => { if (wakeLockRef.current) wakeLockRef.current.release(); };
  }, []);

  // Wake Lock neu anfordern wenn Tab wieder sichtbar wird
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
            setWakeLockActive(false);
          });
        } catch (e) { }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (timerRunning) {
      // Restzeit immer aus der Endzeit berechnen (nicht aufsummiert dekrementieren)
      const tick = () => {
        if (endTimeRef.current != null) {
          setTimerSeconds(Math.round((endTimeRef.current - Date.now()) / 1000));
        }
      };
      tick();
      timerIntervalRef.current = setInterval(tick, 1000);
      // Beim Zurückkehren in den Vordergrund sofort neu berechnen
      const onVis = () => { if (!document.hidden) tick(); };
      document.addEventListener('visibilitychange', onVis);
      return () => { clearInterval(timerIntervalRef.current); document.removeEventListener('visibilitychange', onVis); };
    }
    clearInterval(timerIntervalRef.current);
    return () => clearInterval(timerIntervalRef.current);
  }, [timerRunning]);

  useEffect(() => {
    if (timerSeconds !== null && timerSeconds <= 0 && !plingFiredRef.current) {
      plingFiredRef.current = true;
      playPling();
      if (navigator.vibrate) navigator.vibrate([400, 100, 400]);
    }
  }, [timerSeconds]);

  const unlockAudio = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      // Kurzer "Tick" beim Start — entsperrt iOS Audio
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) { }
  };

  const playPling = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      [0, 0.22, 0.44].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; osc.type = 'sine';
        gain.gain.setValueAtTime(0.6, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 1.0);
        osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 1.0);
      });
    } catch (e) {
    }
  };




  const handleTimerStart = (mins) => {
    unlockAudio();
    plingFiredRef.current = false;
    endTimeRef.current = Date.now() + mins * 60 * 1000;
    setTimerSeconds(mins * 60);
    setTimerRunning(true);
    setShowTimerSetup(false);
  };

  const handleTimerStop = () => {
    setTimerRunning(false);
    setTimerSeconds(null);
    plingFiredRef.current = false;
  };

  const getSteps = () => {
    if (!recipe?.steps) return [];
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = recipe.steps;
    const items = tempDiv.querySelectorAll('li, p');
    const result = [];
    items.forEach(el => {
      // <p> innerhalb eines <li> überspringen — sonst zählt der Schritt doppelt
      if (el.tagName === 'P' && el.closest('li')) return;
      // Führende Nummerierung entfernen — der Kochmodus zählt selbst
      const t = el.textContent.trim().replace(/^(?:Schritt\s+)?\d{1,2}\s*[.):]\s+/i, '');
      if (t) result.push(t);
    });
    return result.length > 0 ? result : [recipe.steps.replace(/<[^>]*>/g, ' ').trim()].filter(Boolean);
  };

  const steps = getSteps();
  const total = steps.length;
  const ingredients = recipe?.ingredients || [];
  const isLast = step === total - 1;
  const timerActive = timerSeconds !== null;
  const isOverdue = timerActive && timerSeconds <= 0;
  const timerBg = isOverdue ? '#c0392b' : '#3C5232';

  const formatTime = (secs) => {
    const abs = Math.abs(secs);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return `${secs < 0 ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`;
  };

  const advance = () => {
    if (step < total - 1) {
      // Timer läuft beim Blättern weiter (z.B. „5 Min köcheln" + nächsten Schritt lesen)
      setHistory(h => [...h, step]);
      setStep(s => s + 1);
    }
  };

  const back = () => {
    if (history.length > 0) {
      setStep(history[history.length - 1]);
      setHistory(h => h.slice(0, -1));
    }
  };

  const stepNum = (step + 1).toString().padStart(2, '0');

  if (total === 0) {
    return (
      <div className="cook-mode">
        <div className="cook-header">
          <button className="cook-close-btn" onClick={onClose}>
            <Icon name="x" size={16} color="var(--cocoa)" />
          </button>
          <div className="cook-title" style={{ flex: 1, margin: '0 10px' }}>{recipe?.title}</div>
          <div style={{ width: 38 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <div style={{ color: 'var(--mute)', fontStyle: 'italic', fontSize: 18 }}>Keine Zubereitungsschritte gefunden.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="cook-mode">

      {/* Header — fix */}
      <div className="cook-header">
        <button className="cook-close-btn" onClick={onClose}>
          <Icon name="x" size={16} color="var(--cocoa)" />
        </button>
        <div className="cook-title" style={{ flex: 1, margin: '0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {recipe?.title}
        </div>
        <div className="cook-awake-pill" style={{ opacity: wakeLockActive ? 1 : 0.4 }}>
          <span className="cook-awake-dot" />
          <span className="cook-awake-label">An</span>
        </div>
      </div>

      {/* Fortschrittsbalken — fix */}
      <div className="cook-progress">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="cook-progress-seg"
            style={{ background: i <= step ? 'var(--espresso)' : 'var(--line-2)' }} />
        ))}
      </div>

      {/* Großer Zahl + schwebendes Timer-Widget — fix, nicht scrollend */}
      <div className="cook-fixed-area">
        <div className="cook-step-num">{stepNum}</div>

        {/* Timer-Widget — schwebt rechts, fix */}
        <div className="cook-timer-float">
          {!timerActive && !showTimerSetup && (
            // Kleine Pill
            <button className="cook-timer-pill"
              onClick={() => setShowTimerSetup(true)}>
              <Icon name="clock" size={14} color="#F9FBF8" />
              <span>Timer</span>
            </button>
          )}

          {!timerActive && showTimerSetup && (
            // Setup-Panel
            <div className="cook-timer-box" style={{ background: 'var(--espresso)' }}>
              <button className="cook-timer-box-close" onClick={() => setShowTimerSetup(false)}>
                <Icon name="x" size={13} color="#F9FBF8" strokeWidth={2.2} />
              </button>
              <TimerSetup onStart={handleTimerStart} />
            </div>
          )}

          {timerActive && (
            // Laufender Timer
            <div className="cook-timer-box cook-timer-box-running" style={{ background: timerBg }}>
              <div className="cook-timer-box-time">{formatTime(timerSeconds)}</div>
              <button className="cook-timer-box-close" onClick={handleTimerStop}>
                <Icon name="x" size={13} color="#F9FBF8" strokeWidth={2.2} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scrollbarer Bereich — nur Text */}
      <div
        className="cook-scroll-area"
        onClick={(e) => {
          const middle = window.innerWidth / 2;
          if (e.clientX > middle) {
            advance();
          } else {
            back();
          }
        }}
      >        <p className="cook-step-text">{steps[step]}</p>
        <div style={{ height: 20 }} />
      </div>

      {/* Zutatenliste — sticky */}
      {ingredients.length > 0 && (
        <div className="cook-ingredients-bar">
          <button className="cook-ingredients-toggle" onClick={() => setShowIngredients(v => !v)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="basket" size={16} color="var(--green)" />
              <span>Zutaten</span>
            </div>
            <Icon name={showIngredients ? 'chev-up' : 'chev-down'} size={16} color="var(--mute)" />          </button>
          {showIngredients && (
            <div className="cook-ingredients-list">
              {ingredients.map((ing, i) => (
                <div key={i} className="cook-ingredient-row">
                  <span className="cook-ingredient-name">{ing.name}</span>
                  <span className="cook-ingredient-amount">
                    {ing.amount}{ing.unit ? ` ${ing.unit}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation — sticky unten */}
      <div className="cook-nav">
        <button className="cook-prev-btn" onClick={back}
          disabled={history.length === 0} style={{ opacity: history.length === 0 ? 0.35 : 1 }}>
          <Icon name="chev-left" size={24} color="var(--espresso)" strokeWidth={1.8} />
        </button>
        {isLast ? (
          <button className="cook-next-btn" onClick={onClose}>Fertig! 🎉</button>
        ) : (
          <button className="cook-next-btn" onClick={advance}>
            Nächster Schritt
            <span style={{ color: 'var(--rose)', fontStyle: 'normal' }}>→</span>
          </button>
        )}
      </div>

    </div>
  );
}
