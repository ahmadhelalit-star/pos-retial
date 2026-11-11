# Retail dashboard period

The dashboard has a restaurant-style date and time filter with automatic application, a Today shortcut and per-user session persistence. Both dates and times use Africa/Cairo. The final selected minute is inclusive: the API receives an exclusive bound at the start of the following minute. Invalid drafts keep the last valid report visible and do not send a new request.

The existing basic report accepts an optional `trend=1` with explicit ISO `from` and `to`. The trend groups actual scoped sales and returns by Cairo hour, day, week, month or year, depending on the range. It has no seven-day cutoff. Sales, costs, tax, returns and payments retain the existing report formulas and permissions. Inventory alerts are a current snapshot and are labeled accordingly. Requests without `trend=1` retain the original response behavior.

Validation includes Cairo midnight and daylight-saving changes, end-minute inclusion, reversed ranges, chart gaps, mocked browser filtering and reload persistence, responsive layouts, and read-only reconciliation of the trend against Developer PostgreSQL totals. No migration is needed.
