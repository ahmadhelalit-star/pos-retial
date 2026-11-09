import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createLocalClient} from './localAgentClient';
import {PrinterIcon} from '../components/common/Icons';
export function SilentReceipt({api,document,english=false,auto=false}){
 const local=useMemo(()=>createLocalClient(api),[api]),job=useRef(null),key=useRef(crypto.randomUUID()),terminal=useRef(null),autoAttempted=useRef(false);
 const [state,setState]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const send=useCallback(async(automatic=false,reprint=false)=>{setBusy(true);setError('');try{
  const agent=await local('/status'),settings=agent.thermal??{printer:agent.printers?.receipt,enabled:Boolean(agent.printers?.receipt),paperSize:'80mm',copies:1,autoPrint:false};
  if(automatic&&!settings.autoPrint)return;
  if(!settings.enabled||!settings.printer)throw Error(english?'Choose and enable the thermal printer in Printing settings.':'اختر طابعة البون وفعّلها من إعدادات الطباعة أولًا.');
  terminal.current=agent.terminalId;
  if(reprint){job.current=null;key.current=crypto.randomUUID();setState(null);}
  else if(automatic)key.current=`thermal:${document.id}:${agent.terminalId}`;
  if(!job.current){const result=await api.request('/print-jobs',{method:'POST',key:key.current,body:{documentId:document.id,kind:document.kind.endsWith('_return')?'return':'receipt',format:settings.paperSize}});job.current=result.id;}
  await api.request(`/print-jobs/${job.current}/dispatch`,{method:'POST',body:{terminalId:agent.terminalId}});setState(await local('/print',{body:{id:job.current}}));
 }catch(failure){setError(failure.message);}finally{setBusy(false);}},[api,local,document.id,document.kind,english]);
 useEffect(()=>{if(!auto)return;const timer=setTimeout(()=>{if(!autoAttempted.current){autoAttempted.current=true;void send(true);}},0);return()=>clearTimeout(timer);},[auto,send]);
 useEffect(()=>{if(!state?.id||!['queued','rendering','submitting'].includes(state.state))return;let live=true;const timer=setInterval(()=>local(`/print/${state.id}`).then(value=>{if(live)setState(value);}).catch(failure=>{if(live)setError(failure.message);}),1000);return()=>{live=false;clearInterval(timer);};},[state?.id,state?.state,local]);
 useEffect(()=>{if(!state?.id||!terminal.current||!['spooled','uncertain','confirmed_printed','cancelled_reviewed'].includes(state.state))return;api.request(`/print-jobs/${state.id}/dispatch/report`,{method:'POST',body:{terminalId:terminal.current,state:state.state}}).catch(()=>{});},[api,state?.id,state?.state]);
 const retry=async()=>{setBusy(true);setError('');try{await local(`/print/${state.id}/retry`,{body:{}});setState({id:state.id,state:'queued'});}catch(failure){setError(failure.message);}finally{setBusy(false);}};
 const review=async outcome=>{setBusy(true);try{setState(await local(`/print/${state.id}/review`,{body:{outcome}}));}catch(failure){setError(failure.message);}finally{setBusy(false);}};
 const pending=state&&['queued','rendering','submitting','uncertain'].includes(state.state),finished=state&&['spooled','confirmed_printed','cancelled_reviewed'].includes(state.state);
 return <div className="space-y-2"><button type="button" className="flex items-center justify-center gap-2 rounded-xl bg-[#00236f] text-white px-4 py-3 text-sm font-bold disabled:opacity-50" disabled={busy||Boolean(pending)} onClick={()=>state?.state==='render_failed'?retry():send(false,Boolean(finished))}><PrinterIcon className="w-5 h-5"/>{busy?(english?'Sending…':'جارٍ الإرسال…'):state?.state==='render_failed'?(english?'Retry printing':'إعادة محاولة الطباعة'):finished?(english?'Reprint receipt':'إعادة طباعة البون'):(english?'Print thermal receipt':'طباعة البون الحراري')}</button>
 {state&&<p role="status" className="text-xs text-gray-500">{state.state==='spooled'?(state.output==='pdf'?(english?'PDF file ready.':'ملف PDF جاهز.'):(english?'Sent to Windows without a print dialog.':'أُرسل البون إلى Windows دون نافذة طباعة.')):state.state==='uncertain'?(english?'Check the printer before any reprint. The job will not repeat automatically.':'تحقق من الطابعة؛ نتيجة الإرسال غير مؤكدة ولن تتكرر تلقائيًا.'):state.state==='render_failed'?(english?'Nothing was sent to the printer; retry is safe.':'لم تُرسل المهمة إلى الطابعة؛ يمكنك إعادة المحاولة.'):['queued','rendering','submitting'].includes(state.state)?(english?'Preparing and sending the receipt…':'جارٍ تجهيز وإرسال البون…'):(english?'Operator review recorded.':'تم تسجيل المراجعة.')}</p>}
 {state?.output==='pdf'&&<a className="underline text-sm text-blue-700" href={`/api/local/print/${state.id}/pdf`} download>{english?'Download PDF':'تنزيل ملف PDF'}</a>}{state?.state==='uncertain'&&<div className="flex flex-wrap gap-2">{['confirmed_printed','cancelled_reviewed'].map(outcome=><button key={outcome} type="button" disabled={busy} className="border rounded-lg px-3 py-2 text-xs" onClick={()=>review(outcome)}>{outcome==='confirmed_printed'?(english?'I verified it printed':'تحققت من خروج البون'):(english?'Reviewed; stop this job':'راجعت النتيجة؛ إيقاف هذه المهمة')}</button>)}</div>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}</div>;
}
