import {useEffect,useRef,useState} from 'react';
import {terminalId} from '../../commercial/device';
import {useAction} from '../../commercial/useAction';
import {PrintDocument} from '../../commercial/views';
import {ClockIcon,ArrowPathIcon,LockClosedIcon,BanknotesIcon,DocumentTextIcon,CreditCardIcon,WalletIcon,XMarkIcon,PlusIcon} from '../../components/common/Icons';
import './ShiftPage.css';

export function ShiftPage({api,user,organization,english}){
  const text=(ar,en)=>english?en:ar,allowed=permission=>user.permissions.includes(permission);
  const [device]=useState(terminalId),[data,setData]=useState(null),[current,setCurrent]=useState(null),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [history,setHistory]=useState(false),[selected,setSelected]=useState(null),[dialog,setDialog]=useState(null),[reportLoading,setReportLoading]=useState(false),[lastClosed,setLastClosed]=useState(null);
  const action=useAction(api),base=organization.company.base_currency;
  const format=(value,code=base)=>new Intl.NumberFormat(english?'en-GB':'ar-EG',{minimumFractionDigits:2,maximumFractionDigits:Math.max(2,organization.currencies.find(row=>row.code===code)?.decimals??2)}).format(Number(value??0))+' '+code;
  const date=value=>value?new Date(value).toLocaleString(english?'en-GB':'ar-EG'):'—';
  const refresh=()=>{setRevision(value=>value+1);window.dispatchEvent(new Event('retail-shift-updated'));};
  useEffect(()=>{
    let active=true;setLoading(true);setError('');
    (async()=>{try{
      const result=await api.request('/shifts');
      const own=result.items.find(row=>!row.closed_at&&row.user_id===user.id&&row.device_id===device);
      const report=own?await api.request(`/shifts/${own.id}`):null;
      if(active){setData(result);setCurrent(report);}
    }catch(failure){if(active)setError(failure.message);}finally{if(active)setLoading(false);}})();
    return()=>{active=false;};
  },[api,user.id,device,revision]);
  const viewReport=async row=>{
    setReportLoading(true);setError('');
    try{setSelected(await api.request(`/shifts/${row.id}`));setDialog('report');}catch(failure){setError(failure.message);}finally{setReportLoading(false);}
  };
  const shift=current?.shift,canClose=shift&&shift.user_id===user.id&&shift.device_id===device&&allowed('shifts.close');
  const metrics=current?[
    {label:text('رصيد البداية','Opening cash'),value:format(shift.opening),icon:WalletIcon,tone:'primary'},
    {label:text('عدد فواتير البيع','Sales invoices'),value:current.sales.filter(row=>row.kind==='sale').reduce((sum,row)=>sum+Number(row.count),0),icon:DocumentTextIcon},
    {label:text('إجمالي المبيعات','Total sales'),value:format(current.sales.filter(row=>row.kind==='sale').reduce((sum,row)=>sum+Number(row.total),0)),icon:BanknotesIcon,tone:'positive'},
    {label:text('مرتجعات المبيعات','Sales returns'),value:format(current.sales.filter(row=>row.kind==='sale_return').reduce((sum,row)=>sum+Number(row.total),0)),icon:ArrowPathIcon,tone:'negative'},
    {label:text('صافي المبيعات','Net sales'),value:format(current.sales.reduce((sum,row)=>sum+(row.kind==='sale'?Number(row.total):row.kind==='sale_return'?-Number(row.total):0),0)),icon:BanknotesIcon,tone:'primary'},
    {label:text('إجمالي المشتريات','Total purchases'),value:format(current.sales.filter(row=>row.kind==='purchase').reduce((sum,row)=>sum+Number(row.total),0)),icon:DocumentTextIcon},
    {label:text('مرتجعات المشتريات','Purchase returns'),value:format(current.sales.filter(row=>row.kind==='purchase_return').reduce((sum,row)=>sum+Number(row.total),0)),icon:ArrowPathIcon,tone:'negative'},
    {label:text('النقد المتوقع بالقيمة الأساسية','Expected cash in base currency'),value:format(current.expectedBase),icon:BanknotesIcon,tone:'primary'},
  ]:[];
  return <div className="retail-shift-page p-3 sm:p-4" dir={english?'ltr':'rtl'}>
    <section className="shift-content space-y-3" aria-labelledby="shift-page-title">
      <header className="shift-heading">
        <div><h1 id="shift-page-title">{text('الوردية الحالية','Current shift')}</h1><p>{text('إدارة درج النقد وعمليات بداية ونهاية يوم العمل.','Manage cash and the start and end of the working day.')}</p></div>
        <div className="shift-actions">
          {shift&&<button className="shift-button" disabled={loading||reportLoading} onClick={()=>viewReport(shift)}><DocumentTextIcon/>{text('تقرير الوردية','Shift report')}</button>}
          {canClose&&<button className="shift-button danger" disabled={loading} onClick={()=>setDialog('close')}><LockClosedIcon/>{text('إغلاق الوردية','Close shift')}</button>}
          <button className="shift-button" aria-pressed={history} onClick={()=>setHistory(value=>!value)}><ClockIcon/>{history?text('إخفاء السجل','Hide history'):text('آخر الورديات المغلقة','Recent closed shifts')}</button>
          <button className="shift-button ghost" disabled={loading} onClick={refresh}><ArrowPathIcon/>{text('تحديث','Refresh')}</button>
        </div>
      </header>
      {error&&<p role="alert" className="shift-error">{error}</p>}
      {loading&&<p role="status" className="text-sm text-gray-500">{text('جارٍ تحميل حالة الوردية…','Loading shift status…')}</p>}
      {reportLoading&&<p role="status">{text('جارٍ تحميل التقرير…','Loading report…')}</p>}
      {!loading&&data&&(shift?<>
        <section className="shift-open-banner">
          <div className="flex items-center gap-3"><span className="shift-status-icon"><ClockIcon/></span><div><h2>{text('الوردية مفتوحة','Shift is open')}</h2><p>{text('الصندوق','Cashbox')}: {data.cashboxes.find(row=>row.id===shift.cashbox_id)?.name??'—'}</p></div></div>
          <div><p>{text('فتحها','Opened by')}: {user.name}</p><time dateTime={shift.opened_at}>{date(shift.opened_at)}</time></div>
        </section>
        <div className="shift-metrics">{metrics.map(({label,value,icon:Icon,tone='default'})=><article key={label} className={`shift-metric ${tone}`}><div><Icon/><span>{label}</span></div><strong>{value}</strong></article>)}</div>
        <CashSummary report={current} text={text} format={format}/>
      </>:<section className="shift-opening">
        <div className="shift-opening-heading"><ClockIcon/><h2>{text('لا توجد وردية مفتوحة','No open shift')}</h2><p>{text('افتح وردية لبدء البيع والتحصيل على هذا الجهاز.','Open a shift to start selling and collecting payments on this terminal.')}</p></div>
        {allowed('shifts.open')?(data.cashboxes.length?<OpenShiftForm api={api} action={action} cashboxes={data.cashboxes} device={device} base={base} text={text} onSaved={refresh}/>:<p className="text-center text-sm text-gray-500">{text('لا يوجد صندوق متاح. أضف صندوقًا أو راجع صلاحيات الفرع.','No cashbox is available. Add one or review branch access.')}</p>):<p className="text-center text-sm text-gray-500">{text('ليس لديك صلاحية فتح وردية.','You do not have permission to open a shift.')}</p>}
      </section>)}
      {lastClosed&&<section className="shift-panel"><h2>{text('تم إغلاق الوردية','Shift closed')}</h2><div className="shift-count-grid">{Object.entries(lastClosed.differences).map(([code,value])=><article key={code} className="shift-metric primary"><span>{text('فرق الإغلاق','Closing difference')}</span><strong>{format(value,code)}</strong></article>)}</div></section>}
      {history&&data&&<section className="shift-panel"><h2>{text('سجل الورديات','Shift history')}</h2><p className="text-xs text-gray-500">{text('آخر 100 وردية متاحة حسب صلاحياتك، بما فيها الورديات المفتوحة.','The latest 100 shifts available to you, including open shifts.')}</p><div className="shift-actions mt-3"><button className="shift-button" aria-pressed={history!=='all'} onClick={()=>setHistory(true)}>{text('المغلقة','Closed')}</button><button className="shift-button" aria-pressed={history==='all'} onClick={()=>setHistory('all')}>{text('جميع الورديات','All shifts')}</button></div><div className="shift-table-scroll"><table><thead><tr>{[text('الصندوق','Cashbox'),text('الافتتاح','Opened'),text('الإغلاق','Closed'),text('الحالة','Status'),text('التقرير','Report')].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{data.items.filter(row=>history==='all'||row.closed_at).map(row=><tr key={row.id}><td>{row.cashbox_name}</td><td>{date(row.opened_at)}</td><td>{date(row.closed_at)}</td><td><span className={`shift-badge ${row.closed_at?'closed':''}`}>{row.closed_at?text('مغلقة','Closed'):text('مفتوحة','Open')}</span></td><td><button className="shift-button" disabled={reportLoading} onClick={()=>viewReport(row)}>{text('عرض التقرير','View report')}</button></td></tr>)}</tbody></table></div>{!data.items.length&&<p>{text('لا توجد ورديات سابقة.','No shift history yet.')}</p>}</section>}
      {allowed('organization.manage')&&data&&<details className="shift-panel" open={!data.cashboxes.length}><summary className="font-bold cursor-pointer">{text('إضافة صندوق نقدية','Add cashbox')}</summary><CashboxForm action={action} organization={organization} user={user} text={text} onSaved={refresh}/></details>}
    </section>
    {dialog==='close'&&current&&<ShiftDialog title={text('إغلاق الوردية','Close shift')} busy={action.busy} onClose={()=>setDialog(null)} text={text}><CloseShiftForm report={current} action={action} device={device} text={text} format={format} onClosed={result=>{setLastClosed(result);setDialog(null);refresh();}}/></ShiftDialog>}
    {dialog==='report'&&selected&&<ShiftDialog title={text('تقرير الوردية','Shift report')} busy={action.busy} onClose={()=>setDialog(null)} text={text}>
      <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{selected.shift.closed_at?text('وردية مغلقة','Closed shift'):text('وردية مفتوحة','Open shift')}</span><time>{date(selected.shift.opened_at)}</time></div>
      <CashSummary report={selected} text={text} format={format}/>
      {selected.shift.close_snapshot&&<div className="shift-count-grid">{Object.entries(selected.shift.close_snapshot.differences).map(([code,value])=><article key={code} className="shift-metric primary"><span>{text('المعدود','Counted')}: {format(selected.shift.close_snapshot.counted[code],code)}</span><strong>{text('الفرق','Difference')}: {format(value,code)}</strong></article>)}</div>}
      {allowed('printing.create')&&<PrintDocument api={api} document={{id:selected.shift.id,kind:'shift_report'}} english={english}/>}
      {selected.shift.closed_at&&allowed('shifts.manage')&&<ReopenShiftForm action={action} report={selected} text={text} onSaved={()=>{setDialog(null);refresh();}}/>}
    </ShiftDialog>}
  </div>;
}

function CashSummary({report,text,format}){
  const methods={cash:text('نقدي','Cash'),card:text('بطاقة','Card'),transfer:text('تحويل','Transfer')};
  return <section className="shift-panel"><h2>{text('حركة النقد وطرق الدفع','Cash and payment activity')}</h2><div className="shift-count-grid">{Object.entries(report.expected).map(([code,value])=><article key={code} className="shift-metric positive"><div><BanknotesIcon/><span>{text('النقد المتوقع بالدرج','Expected cash in drawer')}</span></div><strong>{format(value,code)}</strong></article>)}</div><p className="text-xs text-gray-500">{text('البطاقة والتحويل والآجل لا تدخل في النقد المتوقع بالدرج.','Cards, transfers and credit are excluded from expected cash in the drawer.')}</p>
    {report.methods.length>0?<div className="shift-payment-grid">{report.methods.map((row,index)=><div className="shift-payment-row" key={index}><span className="flex items-center gap-2">{row.method==='card'?<CreditCardIcon/>:<WalletIcon/>}{methods[row.method]??row.method} · {row.direction==='in'?text('مقبوضات','Received'):text('مدفوعات','Paid out')}</span><strong>{format(row.amount,row.currency)}</strong></div>)}</div>:<p className="text-sm text-gray-500">{text('لا توجد حركات دفع في هذه الوردية.','No payments in this shift.')}</p>}
  </section>;
}

function OpenShiftForm({api,action,cashboxes,device,base,text,onSaved}){
  const [opening,setOpening]=useState(''),[cashbox,setCashbox]=useState(cashboxes[0]?.id??'');
  useEffect(()=>{let active=true;api.request('/organization/presentation').then(value=>{if(active&&Number(value.defaultOpeningFloat)>0)setOpening(previous=>previous||String(value.defaultOpeningFloat));}).catch(()=>{});return()=>{active=false;};},[api]);
  return <form className="shift-form" onSubmit={async event=>{event.preventDefault();try{await action.run('/shifts',{cashboxId:cashbox,deviceId:device,opening:Number(opening)});onSaved();}catch{/* error shown in form */}}}>
    <label>{text('صندوق النقدية','Cashbox')}<select value={cashbox} onChange={event=>setCashbox(event.target.value)} disabled={action.busy}>{cashboxes.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
    <label>{text('رصيد بداية الوردية','Opening cash')} · {base}<input type="number" inputMode="decimal" min="0" step="any" required value={opening} disabled={action.busy} onChange={event=>setOpening(event.target.value)}/></label>
    {action.error&&<p role="alert" className="shift-error">{action.error}</p>}
    <button className="shift-button success w-full justify-center" disabled={action.busy}><LockClosedIcon/>{action.busy?text('جارٍ فتح الوردية…','Opening…'):text('فتح الوردية','Open shift')}</button>
  </form>;
}

function CloseShiftForm({report,action,device,text,format,onClosed}){
  const [counted,setCounted]=useState({}),[confirming,setConfirming]=useState(false);
  const codes=Object.keys(report.expected);
  return <form className="shift-form" onSubmit={async event=>{event.preventDefault();if(!confirming){setConfirming(true);return;}try{const result=await action.run(`/shifts/${report.shift.id}/close`,{deviceId:device,counted:Object.fromEntries(codes.map(code=>[code,Number(counted[code])]))});onClosed(result);}catch{/* retry keeps the same request key */}}}>
    <p className="shift-warning">{confirming?text('راجع المبالغ قبل التأكيد. بعد الإغلاق لن يمكن تسجيل حركات جديدة على الوردية.','Review amounts before confirming. A closed shift cannot receive new activity.'):text('عدّ النقد الموجود فعليًا في الدرج، وأدخل مبلغ كل عملة.','Count the cash physically present in the drawer and enter each currency separately.')}</p>
    {codes.map(code=><label key={code}>{text('النقد المعدود','Counted cash')} · {code}<span className="text-xs font-normal text-gray-500">{text('المتوقع','Expected')}: {format(report.expected[code],code)}</span><input aria-label={`${text('النقد المعدود','Counted cash')} ${code}`} type="number" inputMode="decimal" min="0" step="any" required value={counted[code]??''} disabled={confirming||action.busy} onChange={event=>setCounted(previous=>({...previous,[code]:event.target.value}))}/>{confirming&&<strong>{text('الفرق','Difference')}: {format(Number(counted[code])-Number(report.expected[code]),code)}</strong>}</label>)}
    {action.error&&<p role="alert" className="shift-error">{action.error}</p>}
    <div className="shift-actions"><button className="shift-button danger" disabled={action.busy}><LockClosedIcon/>{action.busy?text('جارٍ الإغلاق…','Closing…'):confirming?text('تأكيد الإغلاق','Confirm closing'):text('مراجعة مبلغ الإغلاق','Review closing amounts')}</button>{confirming&&<button type="button" className="shift-button" disabled={action.busy} onClick={()=>setConfirming(false)}>{text('رجوع','Back')}</button>}</div>
  </form>;
}

function ReopenShiftForm({action,report,text,onSaved}){
  return <form className="shift-form" onSubmit={async event=>{event.preventDefault();const reason=new FormData(event.currentTarget).get('reason');try{await action.run(`/shifts/${report.shift.id}/reopen`,{reason});onSaved();}catch{/* error below */}}}><label>{text('سبب إعادة الفتح','Reopening reason')}<input name="reason" required minLength={3} disabled={action.busy}/></label>{action.error&&<p role="alert" className="shift-error">{action.error}</p>}<button className="shift-button" disabled={action.busy}>{text('إعادة فتح الوردية','Reopen shift')}</button></form>;
}

function CashboxForm({action,organization,user,text,onSaved}){
  return <form className="shift-form mt-3" onSubmit={async event=>{event.preventDefault();const form=event.currentTarget,values=new FormData(form);try{await action.run('/cashboxes',{branchId:values.get('branchId'),name:values.get('name')});form.reset();onSaved();}catch{/* error below */}}}><label>{text('اسم الصندوق','Cashbox name')}<input name="name" required maxLength={200} disabled={action.busy}/></label><label>{text('الفرع','Branch')}<select name="branchId" required disabled={action.busy}>{organization.branches.filter(row=>user.branches.includes(row.id)).map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>{action.error&&<p role="alert" className="shift-error">{action.error}</p>}<button className="shift-button" disabled={action.busy}><PlusIcon/>{text('إنشاء الصندوق','Create cashbox')}</button></form>;
}

function ShiftDialog({title,busy,onClose,text,children}){
  const ref=useRef(null);
  useEffect(()=>{const dialog=ref.current;dialog.showModal();return()=>dialog.close();},[]);
  return <dialog ref={ref} aria-label={title} className="retail-shift-dialog" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}><header><h2>{title}</h2><button type="button" aria-label={text('إغلاق النافذة','Close dialog')} disabled={busy} onClick={onClose}><XMarkIcon/></button></header><div className="shift-dialog-content space-y-4">{children}</div></dialog>;
}
