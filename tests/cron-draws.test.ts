import { NextRequest } from 'next/server';
import { GET } from '../app/api/cron/draws/route';
import * as db from '../lib/db';
import * as onesignal from '../lib/notifications/onesignal';
import * as webpush from '../lib/notifications';

jest.mock('../lib/db', () => ({
  query: jest.fn(),
  one: jest.fn(),
  many: jest.fn(),
}));

jest.mock('../lib/notifications/onesignal', () => ({
  sendOneSignalPushNotification: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../lib/notifications', () => ({
  sendWebPushNotification: jest.fn().mockResolvedValue({ success: true }),
}));

describe('Automated Draw Cron (/api/cron/draws)', () => {
  const origEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...origEnv };
    process.env.CRON_SECRET = 'test_secret_123';
  });

  afterAll(() => {
    process.env = origEnv;
  });

  it('should return 401 Unauthorized if wrong secret is provided', async () => {
    const req = new NextRequest('https://punchyplay.com/api/cron/draws', {
      headers: {
        authorization: 'Bearer wrong_secret',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('should authorize with correct query param ?secret=', async () => {
    (db.many as jest.Mock).mockResolvedValueOnce([]); // no pending raffles
    (db.query as jest.Mock).mockResolvedValue({ rows: [] });

    const req = new NextRequest('https://punchyplay.com/api/cron/draws?secret=test_secret_123');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.drawn_count).toBe(0);
  });

  it('should execute draw and dispatch notifications for eligible raffles', async () => {
    (db.query as jest.Mock).mockImplementation((sql: string) => {
      if (typeof sql === 'string' && sql.includes('execute_fair_raffle_draw')) {
        return Promise.resolve({
          rows: [
            {
              winning_ticket_number: 7,
              winning_ticket_id: 'ticket-uuid-7',
              seed: 'SEED_HASH_123',
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    // Mock pending raffles query
    (db.many as jest.Mock).mockResolvedValueOnce([
      {
        id: 'raffle-uuid-1',
        title: 'iPhone 15 Pro',
        slug: 'iphone-15-pro',
        tickets_sold: 20,
        max_tickets: 20,
        status: 'PENDING_DRAW',
      },
    ]);

    // Mock count check
    (db.one as jest.Mock)
      .mockResolvedValueOnce({ count: 20 }) // ticket count > 0
      .mockResolvedValueOnce({ ticket_number: 7, phone_number: '+243810000001' }); // winner ticket details

    const req = new NextRequest('https://punchyplay.com/api/cron/draws', {
      headers: {
        authorization: 'Bearer test_secret_123',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.drawn_count).toBe(1);
    expect(data.results[0].action).toBe('DRAW_EXECUTED');
    expect(data.results[0].winning_ticket_number).toBe(7);

    // Verify OneSignal was dispatched
    expect(onesignal.sendOneSignalPushNotification).toHaveBeenCalledTimes(2);
    // Winner notification
    expect(onesignal.sendOneSignalPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '🎉 CHAMPION ! TU AS GAGNÉ !',
        includeExternalUserIds: ['+243810000001'],
      })
    );
    // Community broadcast notification
    expect(onesignal.sendOneSignalPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Le Vainqueur du Round iPhone 15 Pro est connu'),
      })
    );
  });

  it('should cancel expired raffle if 0 confirmed tickets exist', async () => {
    (db.query as jest.Mock).mockResolvedValue({ rows: [] });

    // Mock pending raffles query with expired ends_at
    (db.many as jest.Mock).mockResolvedValueOnce([
      {
        id: 'raffle-uuid-empty',
        title: 'Casque Audio',
        slug: 'casque-audio',
        tickets_sold: 0,
        max_tickets: 50,
        ends_at: new Date(Date.now() - 3600000).toISOString(),
        status: 'PENDING_DRAW',
      },
    ]);

    // Mock count check returning 0
    (db.one as jest.Mock).mockResolvedValueOnce({ count: 0 });

    const req = new NextRequest('https://punchyplay.com/api/cron/draws', {
      headers: {
        authorization: 'Bearer test_secret_123',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.results[0].action).toBe('CANCELLED_NO_TICKETS');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE raffles SET status = 'CANCELLED'"),
      ['raffle-uuid-empty']
    );
  });
});
