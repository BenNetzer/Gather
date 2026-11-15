// Date logic. Week = Sunday–Saturday (Israel). Weekend = Thursday–Saturday.
window.GatherDates = (function () {
  const DAY = 24 * 60 * 60 * 1000;

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  // Returns {from, to} with `to` exclusive.
  function range(filter, now) {
    const today = startOfDay(now);
    const dow = today.getDay(); // 0 = Sunday … 6 = Saturday
    const endOfWeek = addDays(today, 7 - dow); // next Sunday 00:00
    switch (filter) {
      case "today":
        return { from: today, to: addDays(today, 1) };
      case "week":
        return { from: today, to: endOfWeek };
      case "weekend": {
        const thursday = dow <= 3 ? addDays(today, 4 - dow) : today;
        return { from: thursday, to: endOfWeek };
      }
      default:
        return { from: today, to: new Date(8640000000000000) };
    }
  }

  function endOf(ev) {
    if (ev.end_time) return new Date(ev.end_time);
    return new Date(new Date(ev.start_time).getTime() + 3 * 60 * 60 * 1000);
  }

  // An event is in a range if it starts inside it (and hasn't ended yet).
  function inRange(ev, filter, now) {
    const r = range(filter, now);
    const start = new Date(ev.start_time);
    return start < r.to && endOf(ev) > now && (start >= r.from || endOf(ev) > r.from);
  }

  const fmtDay = new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" });
  const fmtTime = new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" });

  return {
    DAY, startOfDay, range, endOf, inRange,
    dayLabel: (d) => fmtDay.format(new Date(d)),
    timeLabel: (d) => fmtTime.format(new Date(d)),
    dayKey: (d) => startOfDay(d).toDateString(),
  };
})();
