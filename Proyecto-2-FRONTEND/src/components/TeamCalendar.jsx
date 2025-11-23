import React, { useMemo, useState } from 'react';

// Calendario simple de mes que muestra eventos y tareas (por fecha)
export default function TeamCalendar({ teamId, events = [], tasks = [] }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // helpers
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

  const days = useMemo(() => {
    const s = startOfMonth(currentDate);
    const e = endOfMonth(currentDate);
    const arr = [];
    for (let i = 1; i <= e.getDate(); i++) arr.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    return arr;
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    const map = {};
    const add = (dateStr, item) => { map[dateStr] = map[dateStr] || []; map[dateStr].push(item); };

    (events || []).forEach(ev => {
      try {
        const d = ev.inicio ? new Date(ev.inicio) : null;
        if (d) add(d.toISOString().slice(0,10), { type: 'event', data: ev });
      } catch (e) {}
    });
    (tasks || []).forEach(t => {
      try {
        if (!t.fecha_vencimiento) return;
        const d = new Date(t.fecha_vencimiento);
        add(d.toISOString().slice(0,10), { type: 'task', data: t });
      } catch (e) {}
    });
    return map;
  }, [events, tasks]);

  function prevMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function nextMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }

  return (
    <div className="team-calendar panel">
      <div className="cal-header">
        <button className="btn-small" onClick={prevMonth}>&lt;</button>
        <div className="cal-title">{currentDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
        <button className="btn-small" onClick={nextMonth}>&gt;</button>
      </div>

      <div className="cal-grid">
        {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}

        {/* placeholder to align first day */}
        {(() => {
          const firstWeekday = startOfMonth(currentDate).getDay();
          const blanks = [];
          for (let i=0;i<firstWeekday;i++) blanks.push(<div key={'b'+i} className="cal-day empty" />);
          return blanks;
        })()}

        {days.map(day => {
          const key = day.toISOString().slice(0,10);
          const items = eventsByDate[key] || [];
          return (
            <div key={key} className="cal-day">
              <div className="cal-day-number">{day.getDate()}</div>
              <div className="cal-day-items">
                {items.slice(0,3).map((it, idx) => (
                  <div key={idx} className={it.type === 'event' ? 'cal-item cal-item-event' : 'cal-item cal-item-task'}>
                    {it.type === 'event' ? '📅' : '🔔'} <span className="cal-item-title">{it.data.titulo}</span>
                  </div>
                ))}
                {items.length > 3 ? <div className="cal-more">+{items.length-3} más</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
