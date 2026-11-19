/* Deterministic financial calculations. No network, storage, or account mutations. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CFMoney = api;
})(globalThis, function() {
  'use strict';
  function cents(value) {
    const text = String(value ?? '');
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
    const [whole, fraction = ''] = text.split('.');
    const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    return Number.isSafeInteger(result) ? result : null;
  }
  function day(value) {
    const text = String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    const parsed = new Date(text + 'T12:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text ? text : null;
  }
  function summarize(input, today) {
    today = day(today);
    if (!today) throw new Error('A valid reference date is required');
    const totals = { income: 0, expense: 0, received: 0, paid: 0, payable: 0, receivable: 0 };
    const categories = new Map(), due = [], rows = [];
    let ignored = 0;
    for (const raw of Array.isArray(input) ? input : []) {
      const amount = cents(raw.valor);
      if (amount === null || amount <= 0 || !['receita', 'despesa', 'transferencia'].includes(raw.tipo)) { ignored++; continue; }
      if (raw.tipo === 'transferencia') continue;
      if (!['pago', 'pendente', 'atrasado'].includes(raw.status)) { ignored++; continue; }
      const row = { ...raw, cents: amount, due: day(raw.data_vencimento || raw.data) };
      rows.push(row);
      if (row.tipo === 'receita') {
        totals.income += amount;
        totals[row.status === 'pago' ? 'received' : 'receivable'] += amount;
      } else {
        totals.expense += amount;
        totals[row.status === 'pago' ? 'paid' : 'payable'] += amount;
        const name = typeof row.categoria === 'string' ? row.categoria : row.categoria?.nome || 'Sem categoria';
        categories.set(name, (categories.get(name) || 0) + amount);
        if (row.status !== 'pago' && row.due) due.push(row);
      }
    }
    if (Object.values(totals).some(v => !Number.isSafeInteger(v))) throw new Error('Financial total out of range');
    const current = totals.received - totals.paid;
    return { ...totals, cash: current, afterPayables: current - totals.payable,
      projected: current + totals.receivable - totals.payable,
      competence: totals.income - totals.expense, ignored, rows,
      categories: [...categories].sort((a,b) => b[1]-a[1]), due: due.sort((a,b) => a.due.localeCompare(b.due)),
      overdue: due.filter(r => r.due < today), today };
  }
  function forecast(summary, opening, horizon = 30) {
    if (!Number.isSafeInteger(opening) || !Number.isInteger(horizon) || horizon < 1 || horizon > 365) throw new Error('Invalid forecast parameters');
    const end = new Date(summary.today + 'T12:00:00Z');
    end.setUTCDate(end.getUTCDate() + horizon);
    const endDay = end.toISOString().slice(0,10);
    const future = summary.rows.filter(r => r.status !== 'pago' && r.due && r.due >= summary.today && r.due <= endDay)
      .sort((a,b) => a.due.localeCompare(b.due) || (a.tipo === 'despesa' ? -1 : 1));
    let balance = opening, lowest = opening, firstNegative = balance < 0 ? summary.today : null;
    const points = [];
    for (const r of future) {
      balance += r.tipo === 'receita' ? r.cents : -r.cents;
      lowest = Math.min(lowest, balance);
      if (firstNegative === null && balance < 0) firstNegative = r.due;
      points.push({ day: r.due, balance, sourceId: r.id || null });
    }
    return { balance, lowest, firstNegative, points, horizon, assumption: 'Somente lançamentos pendentes com data; despesas antes de receitas no mesmo dia.' };
  }
  function goalContribution(target, current, months) {
    const targetCents = cents(target), savedCents = cents(current);
    if (targetCents === null || savedCents === null || !Number.isInteger(months) || months < 1 || months > 1200) throw new Error('Invalid goal');
    return Math.ceil(Math.max(0, targetCents - savedCents) / months);
  }
  function simulateReduction(monthly, months) {
    const amount = cents(monthly);
    if (amount === null || !Number.isInteger(months) || months < 1 || months > 120) throw new Error('Invalid scenario');
    return Array.from({ length: months }, (_, i) => ({ month: i + 1, cents: amount * (i + 1) }));
  }
  return { cents, day, summarize, forecast, goalContribution, simulateReduction };
});
