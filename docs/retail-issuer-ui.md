# Activation issuer UI — 8 November 2026

Retail now shares Restaurant colors, cards, fields and two main product tabs. Restaurant subpages and APIs remain intact. Retail preserves its existing issuance payload, feature flags, signing provider and separate records.

Changed source: offline-activation/retail-tool.cjs (HTML loading only), issuer-ui/retail.html, tool/public/index.html and styles.css. The future portable asset list and Retail bridge preparation include the new HTML. No release was built or published.

The open review candidate received UI files only; its launcher/runtime were not replaced. It was closed through its normal shutdown endpoint and reopened with the same executable. Source and candidate originals, plus protected file hashes, are privately saved in .developer/issuer-ui-before. Keys, protocol and launcher hashes were verified unchanged after reopening.

Validation: compatibility suite 80/80; isolated browser checks of navigation, mobile, signed Retail issuance, unchanged expiry on feature changes, invalid requests, password clearing and stale result clearing. These checks used synthetic keys and temporary records. Live tool navigation blocked all API writes and issued no real license. Result: .developer/issuer-ui-review/result.json. No Retail Developer activation or business data was created.

Open: http://127.0.0.1:4100/retail
