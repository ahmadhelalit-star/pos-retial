const common=['EGP','SAR','USD','EUR','AED','KWD','QAR','JOD','TRY','SYP','LBP','GBP'];
export const currencyCodes=[...new Set([...common,...(Intl.supportedValuesOf?.('currency')??[])])];
export function currencyLabel(code,english=false){try{return `${new Intl.DisplayNames([english?'en':'ar'],{type:'currency'}).of(code)} (${code})`;}catch{return code;}}
export function formatExchangeRate(value){const text=String(value??'');return /^\d+\.\d+$/.test(text)?text.replace(/0+$/,'').replace(/\.$/,''):text;}
