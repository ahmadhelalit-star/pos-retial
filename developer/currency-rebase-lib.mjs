const fields=new Set(['currency','baseCurrency','base_currency','defaultCurrency']);
const moneyMaps=new Set(['expected','counted','differences']);
export function rebaseJSON(value,from,to,parent=''){
 if(Array.isArray(value))return value.map(item=>rebaseJSON(item,from,to));
 if(!value||typeof value!=='object')return value;
 const result={};for(const [key,item] of Object.entries(value)){
  const nextKey=moneyMaps.has(parent)&&key===from?to:key;
  if(nextKey!==key&&Object.hasOwn(value,to))throw Error('Currency map collision requires review');
  result[nextKey]=fields.has(key)&&item===from?to:rebaseJSON(item,from,to,key);
 }return result;
}
export const rebaseTables={products:['data'],commercial_documents:['snapshot'],commercial_lines:['snapshot'],commercial_orders:['snapshot'],commercial_deliveries:['snapshot'],payments:['snapshot'],partner_entries:[],cash_entries:[],shifts:['close_snapshot'],shift_events:['snapshot'],partners:['data'],idempotency_requests:['response'],module_configuration:['settings']};
export function rebaseRow(table,row,from,to){const next=structuredClone(row);if(Object.hasOwn(next,'currency')&&next.currency===from)next.currency=to;for(const field of rebaseTables[table]??[])next[field]=rebaseJSON(next[field],from,to);return next;}
export const canonical=value=>JSON.stringify(normalize(value));
function normalize(value){if(Array.isArray(value))return value.map(normalize);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalize(value[key])]));return value;}
