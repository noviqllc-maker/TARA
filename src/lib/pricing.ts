// src/lib/pricing.ts
// Subscription pricing for the paywall / profile. Savings, percentage and the
// effective monthly rate are ALWAYS derived from the two prices, so they can never
// drift out of sync — change a price and everything downstream recomputes.
//
// SOURCE OF TRUTH — TODO(RevenueCat): the store is authoritative once IAP is wired.
// Replace the hardcoded constants by feeding the live store products into
// computePricing(); every screen keeps reading `pricing` unchanged:
//
//   export const pricing = computePricing({
//     monthlyAmount:  offering.monthly.product.price,        // number
//     annualAmount:   offering.annual.product.price,         // number
//     monthlyDisplay: offering.monthly.product.priceString,  // localized, e.g. "$9.99"
//     annualDisplay:  offering.annual.product.priceString,
//   });

export const MONTHLY_PRICE = 9.99;
export const ANNUAL_PRICE = 69.99;

const money = (n: number) => `$${n.toFixed(2)}`;

export type Pricing = {
  monthly: { amount: number; display: string; period: 'month' };
  annual: { amount: number; display: string; period: 'year' };
  effectiveMonthly: string; // annual ÷ 12, e.g. "$5.83"
  yearlyIfMonthly: string;  // monthly × 12, e.g. "$119.88"
  savings: string;          // yearly-if-monthly − annual, e.g. "$49.89"
  savingsPercent: number;   // e.g. 42
};

export function computePricing(opts: {
  monthlyAmount?: number;
  annualAmount?: number;
  monthlyDisplay?: string; // pass a store priceString to override formatting/locale
  annualDisplay?: string;
} = {}): Pricing {
  const monthlyAmount = opts.monthlyAmount ?? MONTHLY_PRICE;
  const annualAmount = opts.annualAmount ?? ANNUAL_PRICE;

  const yearlyIfMonthly = monthlyAmount * 12;
  const savingsAmount = yearlyIfMonthly - annualAmount;
  const savingsPercent = Math.round((savingsAmount / yearlyIfMonthly) * 100);

  return {
    monthly: { amount: monthlyAmount, display: opts.monthlyDisplay ?? money(monthlyAmount), period: 'month' },
    annual: { amount: annualAmount, display: opts.annualDisplay ?? money(annualAmount), period: 'year' },
    effectiveMonthly: money(annualAmount / 12),
    yearlyIfMonthly: money(yearlyIfMonthly),
    savings: money(savingsAmount),
    savingsPercent,
  };
}

// The single instance the UI reads today. Swap the internals for RevenueCat later.
export const pricing = computePricing();
