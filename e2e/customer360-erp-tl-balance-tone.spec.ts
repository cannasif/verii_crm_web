import { expect, test } from '@playwright/test';
import { resolveErpTlBalanceTone } from '../src/features/customer-360/utils/erp-tl-balance-tone';

test('120 ile başlayan carilerde TL bakiye renk anlamını tersine çevirir', () => {
  expect(resolveErpTlBalanceTone(250, '120.01.0458')).toBe('danger');
  expect(resolveErpTlBalanceTone(-250, '  120-02-0001  ')).toBe('success');
});

test('320 ile başlayan cariler mevcut TL bakiye renk anlamını korur', () => {
  expect(resolveErpTlBalanceTone(250, '320.01.0003')).toBe('success');
  expect(resolveErpTlBalanceTone(-250, '320.01.0003')).toBe('danger');
});

test('diğer cari gruplarında mevcut davranışı değiştirmez', () => {
  expect(resolveErpTlBalanceTone(250, '600.01.0001')).toBe('success');
  expect(resolveErpTlBalanceTone(-250, null)).toBe('danger');
});

test('sıfır, ihmal edilebilir ve geçersiz değerleri nötr gösterir', () => {
  expect(resolveErpTlBalanceTone(0, '120.01.0458')).toBe('neutral');
  expect(resolveErpTlBalanceTone(0.0000001, '120.01.0458')).toBe('neutral');
  expect(resolveErpTlBalanceTone(Number.NaN, '120.01.0458')).toBe('neutral');
});
