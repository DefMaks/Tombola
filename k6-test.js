import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Métriques personnalisées
const apiDuration = new Trend('punchy_api_duration');
const pageDuration = new Trend('punchy_page_duration');
const errorRate = new Rate('punchy_errors');
const completedJourneys = new Counter('punchy_completed_journeys');

export const options = {
  stages: [
    { duration: '15s', target: 20 },  // Phase 1 : Ramp-up
    { duration: '30s', target: 80 },  // Phase 2 : Montée en charge
    { duration: '30s', target: 120 }, // Phase 3 : Pic à 120 VUs simultanés
    { duration: '20s', target: 120 }, // Phase 4 : Maintien
    { duration: '15s', target: 0 },   // Phase 5 : Descente
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1500', 'p(99)<2500'],
    'punchy_api_duration': ['p(95)<1200'],
    'punchy_page_duration': ['p(95)<800'],
    'http_req_failed': ['rate<0.01'],
    'punchy_errors': ['rate<0.01'],
  },
};

const BASE_URL = 'https://tombola-self-nu.vercel.app';

const HEADERS = {
  'User-Agent': 'k6-load-testing-agent/1.0 (Punchy Stress Scale)',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
};

export default function () {
  const rand = Math.random();

  // PARCOURS 1 : Navigation Accueil & Découverte (50%)
  if (rand < 0.50) {
    group('01_Home_Discovery', function () {
      const homeRes = http.get(`${BASE_URL}/`, { headers: HEADERS });
      pageDuration.add(homeRes.timings.duration);
      check(homeRes, { 'Home 200': (r) => r.status === 200 });

      const rafflesRes = http.get(`${BASE_URL}/api/raffles?status=ACTIVE`, { headers: HEADERS });
      apiDuration.add(rafflesRes.timings.duration);
      check(rafflesRes, { 'API Raffles 200': (r) => r.status === 200 });

      const adsRes = http.get(`${BASE_URL}/api/ads/home`, { headers: HEADERS });
      apiDuration.add(adsRes.timings.duration);
      check(adsRes, { 'API Ads 200': (r) => r.status === 200 });

      const catRes = http.get(`${BASE_URL}/api/categories`, { headers: HEADERS });
      apiDuration.add(catRes.timings.duration);
      check(catRes, { 'API Categories 200': (r) => r.status === 200 });

      completedJourneys.add(1);
      sleep(Math.random() * 0.8 + 0.2);
    });
  } 
  // PARCOURS 2 : Exploration Produit, Live Polling & Transparence (35%)
  else if (rand < 0.85) {
    group('02_Raffle_Detail_&_Live', function () {
      const slug = 'macbook-pro-m3';

      const detailPageRes = http.get(`${BASE_URL}/raffles/${slug}`, { headers: HEADERS });
      pageDuration.add(detailPageRes.timings.duration);
      check(detailPageRes, { 'Detail Page 200': (r) => r.status === 200 });

      const raffleDataRes = http.get(`${BASE_URL}/api/raffles/${slug}`, { headers: HEADERS });
      apiDuration.add(raffleDataRes.timings.duration);
      check(raffleDataRes, { 'API Raffle 200': (r) => r.status === 200 });

      const liveRes = http.get(`${BASE_URL}/api/raffles/${slug}/live`, { headers: HEADERS });
      apiDuration.add(liveRes.timings.duration);
      check(liveRes, { 'API Live 200': (r) => r.status === 200 });

      const recentRes = http.get(`${BASE_URL}/api/raffles/${slug}/recent-tickets`, { headers: HEADERS });
      apiDuration.add(recentRes.timings.duration);
      check(recentRes, { 'API Recent Tickets 200': (r) => r.status === 200 });

      const transPageRes = http.get(`${BASE_URL}/transparency`, { headers: HEADERS });
      pageDuration.add(transPageRes.timings.duration);
      check(transPageRes, { 'Transparency Page 200': (r) => r.status === 200 });

      completedJourneys.add(1);
      sleep(Math.random() * 1.0 + 0.3);
    });
  } 
  // PARCOURS 3 : Filtrage Territorial & Informations / Légalité (15%)
  else {
    group('03_Territorial_&_Legal', function () {
      const communes = ['Gombe', 'Lemba', 'Ngaliema', 'Limete', 'Kalamu'];
      const chosenCommune = communes[Math.floor(Math.random() * communes.length)];

      const communeRes = http.get(`${BASE_URL}/api/raffles?commune=${chosenCommune}`, { headers: HEADERS });
      apiDuration.add(communeRes.timings.duration);
      check(communeRes, { 'API Commune Filter 200': (r) => r.status === 200 });

      const infoRes = http.get(`${BASE_URL}/info`, { headers: HEADERS });
      pageDuration.add(infoRes.timings.duration);
      check(infoRes, { 'Info Page 200': (r) => r.status === 200 });

      completedJourneys.add(1);
      sleep(Math.random() * 0.8 + 0.2);
    });
  }
}
