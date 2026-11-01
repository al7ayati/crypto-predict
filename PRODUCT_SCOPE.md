# Product scope and core-feature audit

## Product definition

Crypto Predict is a personal cryptocurrency market-analysis workspace. Its current supported workflow is to review a small watchlist, inspect exchange-specific daily history, understand a transparent historical trend scenario, inspect technical context and risk heuristics, replay one simple strategy, and create browser-local alerts.

It is an educational analytics product. It is not an exchange, broker, portfolio tracker, automated trading system, or validated investment-prediction service.

## Core feature coverage

| User need | Current implementation | Assessment |
|---|---|---|
| Understand the market at a glance | Dashboard snapshot, tracked-asset market pulse, seven-day daily-close context, live Binance trade stream with labeled CoinGecko fallback | Core workflow present; coverage is limited to five assets |
| Inspect actual market history | Binance Spot daily OHLCV, UTC date ranges, pagination, search, sort, CSV export | Core workflow present; daily candles only |
| Explore a forward-looking scenario | Seven-observation log-return baseline with selectable 1–30 day horizon and visible calculation | Present as a transparent scenario, not a trained forecast or probability |
| Understand technical context | EMA20/50, Bollinger Bands, RSI14, Fear & Greed context | Present; indicators and sentiment do not change the baseline target |
| Understand risk | 20-day realized-volatility heuristic, scenario stop/target levels, reward/risk ratio | Useful context, not calibrated risk estimates or trade instructions |
| Evaluate a strategy | Long-only 7-observation SMA replay, 30/60 day periods, modeled fees, equal-weight Buy & Hold comparison, trade log | Basic replay present; max drawdown is now surfaced |
| Receive alerts | Price-crossing and daily technical-rule alerts, optional browser notifications | On-device only; no cross-device sync or background/server delivery |
| Sign in and install | Firebase email/password, Google sign-in, password reset, installable PWA | Core account and install flows present; live market features require internet |

## Product gaps before positioning as a professional trading terminal

These are deliberately not represented as existing features:

- No trained or independently validated forecasting model, probability calibration, or out-of-sample/walk-forward evaluation.
- No trade execution, exchange account connection, portfolio balances, position ledger, or tax reporting.
- No intraday candle intervals, chart drawing tools, broad asset universe, or multi-exchange comparison.
- No server-side alert scheduler, push delivery after the browser closes, or cross-device alert synchronization.
- The current strategy set is a single simple moving-average rule; its close-price fills and fee assumptions are idealized and omit spreads, slippage, taxes, and intraday execution.
- PWA offline support is limited to the application shell and static assets; authentication, market data, and alert evaluation require connectivity.

The current feature set is sufficient for a focused educational market analytics MVP. It is not yet sufficient to claim professional-grade forecasting, investment advice, or execution-grade trading analytics. The next major product investment should be model/strategy validation and broader data coverage—not adding decorative indicators that do not improve the decision workflow.

## UX and quality principles adopted

- **TradingView-inspired chart interaction:** preserve chart context, make indicator state explicit, support keyboard access to chart interactions, and keep dense market data readable on narrow screens.
- **Financial-data clarity:** always identify provider, exchange/pair, quote currency, timezone, and observation/fetch time. Distinguish USD aggregate quotes from Binance USDT prices and mark stale or incomplete data.
- **Explainability over false precision:** show the inputs and assumptions behind scenarios; do not invent confidence percentages, AI labels, or performance claims.
- **WCAG 2.2 AA as the accessibility target:** keyboard-operable navigation and dialogs, visible focus, focus containment in modal navigation, non-color-only state cues, accessible chart navigation, and adequately sized touch targets.
- **Responsive progressive enhancement:** desktop density may increase, but mobile users retain the same core tasks without horizontal page overflow; reduced-motion preferences are respected.

## Release verification checklist

A merge candidate should pass all of the following before production release:

1. npm ci
2. npm test
3. npm run build
4. Keyboard-only review of navigation, dialogs, forms, filters, and chart interactions.
5. Screen-reader spot checks with VoiceOver and a Windows screen reader.
6. Automated accessibility scan (for example, axe) plus manual contrast/focus review.
7. Responsive checks at 320px, 375px, 768px, 1024px, and wide desktop.
8. Live-data failure checks: offline, Binance stream reconnecting, provider 429/5xx, missing candles, and stale cached data.
9. Firebase Hosting smoke test after deployment, including direct route refresh and authentication flows.

Automated checks and manual device checks must be reported separately. A successful build alone does not establish accessibility or production readiness.

## Reference standards

- W3C, [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
- W3C WAI, [What's new in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- TradingView, [Accessibility documentation](https://www.tradingview.com/charting-library-docs/latest/configuration/accessibility/)
- TradingView, [Charting Library capabilities](https://www.tradingview.com/charting-library-docs/latest/introduction/)