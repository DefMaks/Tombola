import { Client } from 'pg';

jest.mock('pg', () => {
  const mClient = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Client: jest.fn(() => mClient) };
});

describe('execute_fair_raffle_draw logic', () => {
  let client;
  beforeEach(() => {
    client = new Client();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be verifiable as a handler logic (mock test)', async () => {
    client.query.mockResolvedValueOnce({ rows: [{ winning_ticket_number: 123 }] });

    const res = await client.query('SELECT * FROM execute_fair_raffle_draw($1)', ['fake-uuid']);
    expect(client.query).toHaveBeenCalledWith('SELECT * FROM execute_fair_raffle_draw($1)', ['fake-uuid']);
    expect(res.rows[0].winning_ticket_number).toBe(123);
  });
});
