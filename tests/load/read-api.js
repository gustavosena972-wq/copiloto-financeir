import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failures = new Rate('request_failures');
const apiLatency = new Trend('supabase_read_latency', true);

const base = (__ENV.SUPABASE_URL || '').replace(/\\/$/, '');
const key = __ENV.SUPABASE_ANON_KEY || '';
const token = __ENV.SUPABASE_ACCESS_TOKEN || '';
const familyId = __ENV.FAMILY_ID || '';

if (!base || !key || !token || !familyId) {
  throw new Error('Defina SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ACCESS_TOKEN e FAMILY_ID.');
}

const stages = [
  { duration: __ENV.RAMP_UP || '1m', target: Number(__ENV.PEAK_VUS || 10) },
  { duration: __ENV.HOLD || '3m', target: Number(__ENV.PEAK_VUS || 10) },
  { duration: __ENV.RAMP_DOWN || '1m', target: 0 },
];

export const options = {
  stages,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    request_failures: ['rate<0.01'],
  },
};

const headers = {
  apikey: key,
  Authorization: 'Bearer ' + token,
  Accept: 'application/json',
};

function readTable(table, query) {
  const url = base + '/rest/v1/' + table + '?' + query;
  const res = http.get(url, { headers, tags: { table } });
  apiLatency.add(res.timings.duration, { table });
  const ok = check(res, {
    [table + ': HTTP 200']: (r) => r.status === 200,
    [table + ': JSON response']: (r) => {
      try { JSON.parse(r.body); return true; } catch (_) { return false; }
    },
  });
  failures.add(!ok);
}

export default function () {
  readTable('meses', 'select=id,mes,ano_id,status&familia_id=eq.' + familyId + '&limit=12');
  readTable('lancamentos', 'select=id,mes_id,tipo,valor,status,data_vencimento&familia_id=eq.' + familyId + '&order=data_vencimento.desc&limit=50');
  sleep(1);
}
