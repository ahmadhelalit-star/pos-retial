import {useEffect,useState} from 'react';
import {useLocale} from '../../../runtime/i18n.js';
export function VariantDistribution({productId,variants,load,onChange,allowFractional,canDistribute}){
 const english=useLocale()==='en',[source,setSource]=useState(null),[values,setValues]=useState({}),[error,setError]=useState('');
 useEffect(()=>{let live=true;load(productId).then(result=>{if(live)setSource(result.items);}).catch(failure=>{if(live)setError(failure.message);});return()=>{live=false;};},[load,productId]);
 useEffect(()=>{
  if(!source||!canDistribute){onChange(null);return;}
  const rows=source.map(row=>({warehouseId:row.warehouseId,expectedQuantity:row.quantity,items:variants.map(variant=>({variantId:variant.id,quantity:Number(values[row.warehouseId]?.[variant.id]??0)}))}));
  const valid=rows.every(row=>row.items.every(item=>Number.isFinite(item.quantity)&&item.quantity>=0&&(allowFractional||Number.isInteger(item.quantity)))&&Math.round(row.items.reduce((sum,item)=>sum+item.quantity,0)*1e9)===Math.round(Number(row.expectedQuantity)*1e9));
  onChange(valid?rows:null);
 },[source,values,variants,onChange,allowFractional,canDistribute]);
 return <section className="rounded-2xl border border-blue-200 bg-[#f0f3ff] p-4 space-y-3" aria-label={english?'Distribute current stock':'توزيع الرصيد الحالي'}><h3 className="font-bold text-[#00236f]">{english?'3. Distribute existing stock':'٣. وزّع الرصيد الحالي على التركيبات'}</h3><p className="text-xs text-gray-600">{english?'Allocate each warehouse balance. This transfers existing stock; it does not add new stock.':'حدّد نصيب كل تركيبة من الرصيد الموجود. هذا توزيع للرصيد الحالي، وليس إضافة رصيد جديد.'}</p>
 {!canDistribute&&<p role="alert">{english?'Stock adjustment permission is required.':'تحتاج صلاحية تعديل المخزون لإجراء التوزيع.'}</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}
 {!source&&!error&&<p role="status">{english?'Loading balances…':'جارٍ قراءة أرصدة المخازن…'}</p>}
 {source?.length===0&&<p>{english?'No existing stock needs allocation.':'لا يوجد رصيد حالي يحتاج إلى توزيع.'}</p>}
 {source?.map(row=>{const total=Math.round(variants.reduce((sum,item)=>sum+Number(values[row.warehouseId]?.[item.id]??0),0)*1e9)/1e9,remaining=Math.round((Number(row.quantity)-total)*1e9)/1e9;return <fieldset key={row.warehouseId} disabled={!canDistribute} className="bg-white border border-gray-200 rounded-xl p-3 space-y-3"><legend className="font-bold">{row.name} — {english?'Current stock':'الرصيد الحالي'}: {Number(row.quantity)}</legend><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{variants.map((variant,index)=><label key={variant.id}>{Object.values(variant.values).filter(Boolean).join(' / ')||(english?`Variant ${index+1}`:`تركيبة ${index+1}`)}<input aria-label={`${english?'Allocate':'توزيع'} ${row.name} ${index+1}`} className="w-full border border-gray-300 rounded-xl p-2" type="number" min="0" step={allowFractional?'any':'1'} value={values[row.warehouseId]?.[variant.id]??''} onChange={event=>setValues(previous=>({...previous,[row.warehouseId]:{...previous[row.warehouseId],[variant.id]:event.target.value}}))}/></label>)}</div><p className={remaining===0?'text-emerald-700':'text-red-700'}>{english?'Allocated':'الموزع'}: {total} · {english?'Remaining':'المتبقي'}: {remaining}</p></fieldset>;})}
 </section>;
}
