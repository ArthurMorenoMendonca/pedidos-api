import http from 'k6/http';
import { check, sleep } from 'k6';

// Smoke test do fluxo principal: criar -> pagar -> concluir.
// Uso: k6 run k6/smoke.js   (ou BASE_URL=http://host:porta k6 run k6/smoke.js)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    // SLO: p95 abaixo de 300 ms e menos de 1% de falhas.
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

const headers = { 'Content-Type': 'application/json' };

export default function () {
  const payload = JSON.stringify({
    customerId: `cliente-${__VU}`,
    items: [{ sku: 'LIVRO-1', quantity: 2, unitPriceCents: 4500 }],
  });

  const created = http.post(`${BASE_URL}/orders`, payload, { headers });
  check(created, { 'criou (201)': (r) => r.status === 201 });
  const id = created.json('id');

  const paid = http.post(`${BASE_URL}/orders/${id}/pay`);
  check(paid, { 'pagou (200)': (r) => r.status === 200 });

  const done = http.post(`${BASE_URL}/orders/${id}/complete`);
  check(done, { 'concluiu (200)': (r) => r.status === 200 && r.json('status') === 'COMPLETED' });

  sleep(0.2);
}
