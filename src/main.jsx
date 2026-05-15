import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  Baby,
  Bath,
  Bell,
  CalendarDays,
  Clock3,
  Droplets,
  Edit3,
  LineChart,
  Milk,
  Moon,
  Pill,
  Plus,
  Ruler,
  Sparkles,
  Sun,
  Trash2,
  Utensils,
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'baby-track-first-30-v2';

const quickActions = [
  { type: 'feed', label: 'Nursing', icon: Milk, color: '#2f6f73', detail: 'Left/right or total minutes' },
  { type: 'bottle', label: 'Bottle', icon: Droplets, color: '#5d6fb4', detail: 'Milk or formula amount' },
  { type: 'sleep', label: 'Sleep', icon: Moon, color: '#42516f', detail: 'Nap or overnight stretch' },
  { type: 'diaper', label: 'Diaper', icon: Bath, color: '#aa6c39', detail: 'Wet, dirty, or both' },
  { type: 'pump', label: 'Pump', icon: Utensils, color: '#8b5d86', detail: 'Output and side notes' },
  { type: 'medicine', label: 'Medicine', icon: Pill, color: '#b14f4a', detail: 'Dose, vitamin, or symptom' },
  { type: 'growth', label: 'Growth', icon: Ruler, color: '#4d8061', detail: 'Weight, length, head size' },
  { type: 'activity', label: 'Activity', icon: Activity, color: '#c07843', detail: 'Tummy time, bath, walk' },
];

const defaultState = {
  babyName: 'Baby',
  birthDate: new Date().toISOString().slice(0, 10),
  selectedDate: new Date().toISOString().slice(0, 10),
  events: [],
  reminders: [
    { id: 'r1', label: 'Vitamin D', cadence: 'Daily', enabled: true },
    { id: 'r2', label: 'Next pediatric visit', cadence: 'Schedule', enabled: false },
  ],
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
  } catch {
    return defaultState;
  }
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDateLabel(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function daysOld(birthDate, selectedDate) {
  const birth = new Date(`${birthDate}T12:00:00`);
  const selected = new Date(`${selectedDate}T12:00:00`);
  return Math.max(0, Math.round((selected - birth) / 86400000));
}

function actionFor(type) {
  return quickActions.find((item) => item.type === type) || quickActions[0];
}

function sortEvents(events) {
  return [...events].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

function App() {
  const [state, setState] = useState(loadState);
  const [activeType, setActiveType] = useState('feed');
  const [detail, setDetail] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const selectedEvents = useMemo(
    () => sortEvents(state.events.filter((event) => event.date === state.selectedDate)),
    [state.events, state.selectedDate],
  );

  const summary = useMemo(() => {
    const count = (type) => selectedEvents.filter((event) => event.type === type).length;
    const last = (type) => selectedEvents.find((event) => event.type === type);
    return {
      feeds: count('feed') + count('bottle'),
      diapers: count('diaper'),
      sleep: count('sleep'),
      meds: count('medicine'),
      lastFeed: last('feed') || last('bottle'),
      lastSleep: last('sleep'),
      lastDiaper: last('diaper'),
    };
  }, [selectedEvents]);

  const weeklyEvents = useMemo(() => {
    const selected = new Date(`${state.selectedDate}T12:00:00`);
    return state.events.filter((event) => {
      const eventDate = new Date(`${event.date}T12:00:00`);
      const diff = (selected - eventDate) / 86400000;
      return diff >= 0 && diff < 7;
    });
  }, [state.events, state.selectedDate]);

  function updateState(field, value) {
    setState((current) => ({ ...current, [field]: value }));
  }

  function addEvent(type = activeType, preset = '') {
    const action = actionFor(type);
    const note = [preset, detail.trim()].filter(Boolean).join(' - ');
    setState((current) => ({
      ...current,
      events: [
        {
          id: crypto.randomUUID(),
          type,
          label: action.label,
          detail: note || action.detail,
          amount: amount.trim(),
          date: current.selectedDate,
          time: formatTime(),
          createdAt: new Date().toISOString(),
        },
        ...current.events,
      ],
    }));
    setDetail('');
    setAmount('');
  }

  function deleteEvent(id) {
    setState((current) => ({
      ...current,
      events: current.events.filter((event) => event.id !== id),
    }));
  }

  function moveDay(delta) {
    const date = new Date(`${state.selectedDate}T12:00:00`);
    date.setDate(date.getDate() + delta);
    updateState('selectedDate', date.toISOString().slice(0, 10));
  }

  function toggleReminder(id) {
    setState((current) => ({
      ...current,
      reminders: current.reminders.map((item) => (
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )),
    }));
  }

  const babyAge = daysOld(state.birthDate, state.selectedDate);
  const nextCue = summary.lastFeed
    ? `Last feed was at ${summary.lastFeed.time}. Watch for rooting, hands to mouth, or stirring.`
    : 'Log the first feed when baby cues or after your clinician-recommended interval.';

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="mark"><Baby size={28} /></div>
        <label>
          <span>Baby</span>
          <input value={state.babyName} onChange={(event) => updateState('babyName', event.target.value)} />
        </label>
        <label>
          <span>Birth date</span>
          <input type="date" value={state.birthDate} onChange={(event) => updateState('birthDate', event.target.value)} />
        </label>
        <label>
          <span>Tracking day</span>
          <input type="date" value={state.selectedDate} onChange={(event) => updateState('selectedDate', event.target.value)} />
        </label>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Baby tracker</p>
          <h1>{state.babyName}'s day</h1>
          <p>{formatDateLabel(state.selectedDate)} · day {babyAge + 1} · fast logs, useful patterns, calm guidance.</p>
        </div>
        <div className="date-stepper">
          <button type="button" onClick={() => moveDay(-1)} aria-label="Previous day">-</button>
          <strong>{babyAge}d old</strong>
          <button type="button" onClick={() => moveDay(1)} aria-label="Next day">+</button>
        </div>
      </section>

      <section className="summary-strip" aria-label="Daily summary">
        <Stat icon={Milk} label="Feeds" value={summary.feeds} sub={summary.lastFeed ? `Last ${summary.lastFeed.time}` : 'None yet'} />
        <Stat icon={Bath} label="Diapers" value={summary.diapers} sub={summary.lastDiaper ? `Last ${summary.lastDiaper.time}` : 'None yet'} />
        <Stat icon={Moon} label="Sleep" value={summary.sleep} sub={summary.lastSleep ? `Last ${summary.lastSleep.time}` : 'None yet'} />
        <Stat icon={Pill} label="Meds" value={summary.meds} sub="Doses logged" />
      </section>

      <section className="workspace">
        <article className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">One-tap logging</p>
              <h2>What just happened?</h2>
            </div>
            <Clock3 />
          </div>

          <div className="quick-grid">
            {quickActions.map(({ type, label, icon: Icon, color }) => (
              <button
                className={activeType === type ? 'quick-action is-active' : 'quick-action'}
                style={{ '--action': color }}
                type="button"
                key={type}
                onClick={() => {
                  setActiveType(type);
                  addEvent(type);
                }}
              >
                <Icon size={23} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="detail-box">
            <div className="detail-title">
              <Edit3 size={18} />
              <strong>Add detail to next log</strong>
            </div>
            <div className="detail-fields">
              <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount, duration, side..." />
              <input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Optional note..." />
              <button type="button" onClick={() => addEvent()} aria-label="Add detailed log"><Plus /></button>
            </div>
            <div className="preset-row">
              <button type="button" onClick={() => addEvent('diaper', 'Wet')}>Wet</button>
              <button type="button" onClick={() => addEvent('diaper', 'Dirty')}>Dirty</button>
              <button type="button" onClick={() => addEvent('feed', 'Left side')}>Left</button>
              <button type="button" onClick={() => addEvent('feed', 'Right side')}>Right</button>
              <button type="button" onClick={() => addEvent('activity', 'Tummy time')}>Tummy</button>
            </div>
          </div>
        </article>

        <article className="panel timeline-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Timeline</p>
              <h2>Today's logs</h2>
            </div>
            <CalendarDays />
          </div>
          <div className="timeline">
            {selectedEvents.length === 0 ? (
              <p className="empty-state">No logs yet. Tap a button when baby feeds, sleeps, wakes, or needs a diaper.</p>
            ) : selectedEvents.map((event) => {
              const action = actionFor(event.type);
              const Icon = action.icon;
              return (
                <div className="event-row" key={event.id}>
                  <div className="event-icon" style={{ '--action': action.color }}><Icon size={18} /></div>
                  <div>
                    <strong>{event.label}</strong>
                    <p>{[event.amount, event.detail].filter(Boolean).join(' · ')}</p>
                  </div>
                  <time>{event.time}</time>
                  <button type="button" onClick={() => deleteEvent(event.id)} aria-label={`Delete ${event.label}`}><Trash2 size={16} /></button>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Next up</p>
              <h2>Care cue</h2>
            </div>
            <Sparkles />
          </div>
          <div className="cue-card">
            <Sun />
            <p>{nextCue}</p>
          </div>
          <div className="mini-checklist">
            <span>Newborn basics</span>
            <p>Track feeds and diapers closely in the early days, and contact your pediatrician for poor feeding, fever, dehydration signs, trouble breathing, or unusual lethargy.</p>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Patterns</p>
              <h2>Last 7 days</h2>
            </div>
            <LineChart />
          </div>
          <div className="trend-list">
            <Trend label="Feeds" value={weeklyEvents.filter((event) => event.type === 'feed' || event.type === 'bottle').length} />
            <Trend label="Diapers" value={weeklyEvents.filter((event) => event.type === 'diaper').length} />
            <Trend label="Sleep logs" value={weeklyEvents.filter((event) => event.type === 'sleep').length} />
            <Trend label="Growth notes" value={weeklyEvents.filter((event) => event.type === 'growth').length} />
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Reminders</p>
              <h2>Care prompts</h2>
            </div>
            <Bell />
          </div>
          <div className="reminder-list">
            {state.reminders.map((reminder) => (
              <button className={reminder.enabled ? 'reminder is-on' : 'reminder'} type="button" key={reminder.id} onClick={() => toggleReminder(reminder.id)}>
                <span>{reminder.label}</span>
                <small>{reminder.cadence}</small>
              </button>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <article className="stat-card">
      <Icon />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{sub}</small>
      </div>
    </article>
  );
}

function Trend({ label, value }) {
  const width = Math.min(100, value * 10 + 8);
  return (
    <div className="trend">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="bar"><span style={{ width: `${width}%` }} /></div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
