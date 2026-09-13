import { initiateTwigaPayment, checkTwigaPaymentStatus, isTwigaPaymentSuccess, isTwigaPaymentFailed } from '../lib/twiga';

// Mock fetch globally
global.fetch = jest.fn();

describe('TwigaPaie handlers', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
    // Disable console logs for test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initiateTwigaPayment should call fetch and return parsed data', async () => {
    const mockResponse = { ok: true, status: 200, text: jest.fn().mockResolvedValue('{"status":"PENDING"}') };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const promise = initiateTwigaPayment({
      raffle_id: 'r1', amount: 1, currency: 'USD', phone_number: '+243820000000', quantity: 1, operator: 'VODACOM'
    });

    // allow microtasks to flush
    jest.runAllTimers();
    const result = await promise;

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.data.status).toBe('PENDING');
    expect(result.ok).toBe(true);
  });

  it('initiateTwigaPayment should catch errors and return fallback', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const promise = initiateTwigaPayment({
      raffle_id: 'r1', amount: 1, currency: 'USD', phone_number: '+243820000000', quantity: 1, operator: 'VODACOM'
    });

    jest.runAllTimers();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect(result.data.error).toBe('Network error');
  });

  it('checkTwigaPaymentStatus should return parsed json', async () => {
    const mockResponse = { json: jest.fn().mockResolvedValue({ status: 'SUCCESS' }) };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const promise = checkTwigaPaymentStatus('merchant123');
    jest.runAllTimers();
    const result = await promise;

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('SUCCESS');
  });

  it('isTwigaPaymentSuccess should return true for success payloads', () => {
    expect(isTwigaPaymentSuccess({ event: 'PAYMENT_SUCCESS' })).toBe(true);
    expect(isTwigaPaymentSuccess({ data: { status: 2 } })).toBe(true);
    expect(isTwigaPaymentSuccess({ payload: { data: [{ state: 'COMPLETED' }] } })).toBe(true);
    expect(isTwigaPaymentSuccess({ status: 'PENDING' })).toBe(false);
  });

  it('isTwigaPaymentFailed should return true for failed payloads', () => {
    expect(isTwigaPaymentFailed({ data: { status: 3 } })).toBe(true);
    expect(isTwigaPaymentFailed({ payload: { state: 'FAILED' } })).toBe(true);
    expect(isTwigaPaymentFailed({ status: 'SUCCESS' })).toBe(false);
  });
});
