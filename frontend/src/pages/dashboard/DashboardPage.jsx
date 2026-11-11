import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {dashboardPeriodBounds,dashboardTrendPoints,todayDashboardPeriod} from '../../../../shared/dashboard-period.js';
import {ClockIcon,DocumentChartBarIcon,BanknotesIcon,ShoppingBagIcon,ReceiptPercentIcon,ArrowTrendingUpIcon,ArchiveBoxIcon,CreditCardIcon,UsersIcon} from '../../components/common/Icons';
import {SalesTrendChart} from './components/SalesTrendChart';
import './DashboardPage.css';

const fields=['dateFrom','timeFrom','timeTo','dateTo'];
const savedPeriod=key=>{
  try{const value=JSON.parse(sessionStorage.getItem(key));if(dashboardPeriodBounds(value))return value;}catch{/* storage unavailable */}
  return todayDashboardPeriod();
};

export function DashboardPage({api,user,english}){
  const t=(ar,en)=>english?en:ar,storageKey=`retail:dashboard-period:${user?.companyId}:${user?.id}`;
  const [period,setPeriod]=useState(()=>savedPeriod(storageKey)),[draft,setDraft]=useState(period),[revision,setRevision]=useState(0),[result,setResult]=useState(null);
  const bounds=dashboardPeriodBounds(period),query=new URLSearchParams({...bounds,trend:'1'}).toString(),key=`${query}:${revision}`;
  const report=result?.key===key?result.report:null,error=result?.key===key?result.error:null;
  const validDraft=Boolean(dashboardPeriodBounds(draft));
  const change=(field,value)=>{
    const next={...draft,[field]:value};setDraft(next);
    if(dashboardPeriodBounds(next))setPeriod(next);
  };
  const today=()=>{const value=todayDashboardPeriod();setDraft(value);setPeriod(value);setRevision(n=>n+1);};
  useEffect(()=>{try{sessionStorage.setItem(storageKey,JSON.stringify(period));}catch{/* storage unavailable */}},[storageKey,period]);
  useEffect(()=>{
    let live=true,request;
    const load=async()=>{
      request?.abort();const controller=new AbortController();request=controller;
      try{const value=await api.request(`/reports/basic?${query}`,{signal:controller.signal});if(live&&!controller.signal.aborted)setResult({key,report:value});}
      catch(failure){if(live&&!controller.signal.aborted)setResult({key,error:failure.message});}
    };
    const initial=setTimeout(load,200),refresh=setInterval(load,60000);
    return()=>{live=false;clearTimeout(initial);clearInterval(refresh);request?.abort();};
  },[api,key,query]);
  const currency=report?.baseCurrency??'',digits=report?.decimals??2;
  const number=new Intl.NumberFormat(english?'en-GB':'ar-EG',{maximumFractionDigits:3});
  const moneyFormat=new Intl.NumberFormat(english?'en-GB':'ar-EG',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const money=value=>`${moneyFormat.format(Number(value??0))} ${currency}`;
  const sales=report?.documents.find(row=>row.kind==='sale'),count=Number(sales?.count??0),dashboard=report?.dashboard;
  const metrics=report?[
    [t('مبيعات الفترة','Period sales'),money(report.summary.salesBase),t('بعد المرتجعات','After returns'),BanknotesIcon,'blue'],
    [t('صافي المشتريات','Net purchases'),money(report.summary.purchasesBase),t('بعد مرتجعات الشراء','After purchase returns'),ShoppingBagIcon,'blue'],
    [t('الربح الإجمالي للمنتجات','Gross product profit'),money(report.summary.grossProfitBase),t('بعد خصم تكلفة المنتجات','After product costs'),ArrowTrendingUpIcon,'green'],
    [t('فواتير البيع','Sales invoices'),number.format(count),t('الفواتير المعتمدة خلال الفترة','Posted during this period'),DocumentChartBarIcon,'blue'],
    [t('ضريبة المبيعات','Sales tax'),money(report.summary.salesTaxBase),t('بعد ضريبة المرتجعات','After tax on returns'),ReceiptPercentIcon,'amber'],
  ]:[];
  const payments=new Map(),labels={cash:t('نقدي','Cash'),card:t('بطاقة','Card'),transfer:t('تحويل بنكي','Bank transfer')};
  for(const row of report?.payments??[]){if(row.direction==='in')payments.set(row.method,(payments.get(row.method)??0)+Number(row.amount_base));}
  return <div className="retail-dashboard retail-original-dashboard" dir={english?'ltr':'rtl'}>
    <section className="dashboard-period" aria-labelledby="dashboard-period-title">
      <div className="dashboard-period-heading"><span className="dashboard-icon"><ClockIcon/></span><div><h1 id="dashboard-period-title">{t('الفترة الزمنية','Time period')}</h1><p>{t('بتوقيت القاهرة','Cairo time')}</p></div></div>
      <div className="dashboard-period-fields">{fields.map((field,index)=><label key={field}>{[t('من تاريخ','From date'),t('من وقت','From time'),t('إلى وقت','To time'),t('إلى تاريخ','To date')][index]}<input type={field.startsWith('date')?'date':'time'} required value={draft[field]} onChange={event=>change(field,event.target.value)}/></label>)}<button type="button" className="dashboard-today" onClick={today}>{t('اليوم','Today')}</button></div>
      {!validDraft&&<p className="dashboard-error" role="alert">{t('اختر تاريخًا ووقتًا صالحين، على ألا تسبق النهاية البداية. تُعرض آخر فترة صحيحة.','Choose valid dates and times with the end on or after the start. Showing the last valid period.')}</p>}
    </section>
    {error&&<p role="alert" className="dashboard-error">{error} <button type="button" onClick={()=>setRevision(n=>n+1)}>{t('إعادة المحاولة','Retry')}</button></p>}
    {!report&&!error&&<p className="dashboard-panel" role="status">{t('جارٍ تحميل لوحة التحكم…','Loading dashboard…')}</p>}
    {report&&<>
      <div className="dashboard-kpis">{metrics.map(([label,value,helper,Icon,tone])=><article key={label} className={`dashboard-kpi ${tone}`}><div><Icon/><span>{label}</span></div><strong>{value}</strong><small>{helper}</small></article>)}</div>
      <div className="dashboard-main-grid">
        <TrendChart rows={dashboardTrendPoints(dashboard.trend??[],bounds,dashboard.granularity)} granularity={dashboard.granularity} money={money} english={english} t={t}/>
        <Panel title={t('الأصناف الأكثر مبيعًا','Top products')} subtitle={t('أعلى 5 أصناف حسب إيراد الفترة','Top five by revenue in this period')} icon={ShoppingBagIcon}>
          {dashboard.topProducts.length?<div className="dashboard-table"><table><thead><tr>{[t('الصنف','Product'),t('الكمية','Quantity'),t('الإيراد','Revenue'),t('الربح','Profit')].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{dashboard.topProducts.map(row=><tr key={row.id}><td>{row.name}</td><td>{number.format(Number(row.quantity))}</td><td>{money(row.revenue)}</td><td>{money(row.profit)}</td></tr>)}</tbody></table></div>:<Empty t={t}/>}
        </Panel>
      </div>
      <div className="dashboard-bottom-grid">
        <Panel title={t('أرصدة الحسابات','Account balances')} subtitle={t('حتى نهاية الفترة المحددة','As of the end of the selected period')} icon={UsersIcon}>
          <AccountBalances accounts={report.accounts ?? []} money={money} number={number} t={t}/>
        </Panel>
        <Panel title={t('التحصيل حسب طريقة الدفع','Receipts by payment method')} subtitle={t('المقبوضات المسجلة خلال الفترة','Incoming payments recorded in this period')} icon={CreditCardIcon}><Breakdown rows={[...payments].map(([method,value])=>[labels[method]??method,value])} money={money} t={t}/></Panel>
        <Panel title={t('تنبيهات المخزون','Stock alerts')} subtitle={t('الأرصدة الحالية، مستقلة عن الفترة','Current balances, independent of the period')} icon={ArchiveBoxIcon}>
          {dashboard.lowStockProducts.length?<ul className="dashboard-stock">{dashboard.lowStockProducts.map(row=><li key={row.id}><span>{row.name}</span><strong>{number.format(Number(row.stock))} {row.unit}</strong></li>)}</ul>:<p className="dashboard-empty">{t('لا توجد أصناف منخفضة الرصيد.','No low-stock products.')}</p>}
          <Link className="dashboard-today dashboard-stock-link" to="/purchases">{t('فتح المشتريات','Open purchases')}</Link>
        </Panel>
      </div>
    </>}
  </div>;
}

function Panel({title,subtitle,icon:Icon,children}){
  return <section className="dashboard-panel"><header><span className="dashboard-icon"><Icon/></span><div><h3>{title}</h3><p>{subtitle}</p></div></header>{children}</section>;
}
function Empty({t}){return <p className="dashboard-empty">{t('لا توجد حركة في الفترة المحددة.','No activity in the selected period.')}</p>;}
function AccountBalances({accounts,money,number,t}){
  if(!accounts.length)return <p className="dashboard-empty">{t('لا توجد أرصدة حسابات.','No account balances.')}</p>;
  return <div className="dashboard-table"><table>
    <thead><tr><th>{t('الحسابات','Accounts')}</th><th>{t('مستحق','Due')}</th><th>{t('دائن','Credit')}</th></tr></thead>
    <tbody>{accounts.map(row=><tr key={row.kind}>
      <td>{row.kind==='customer'?t('العملاء','Customers'):t('الموردون','Suppliers')} · {number.format(Number(row.accounts))}</td>
      <td>{money(row.due_base)}</td><td>{money(row.credit_base)}</td>
    </tr>)}</tbody>
  </table></div>;
}
function Breakdown({rows,money,t}){
  if(!rows.length)return <Empty t={t}/>;
  const max=Math.max(1,...rows.map(([,value])=>Math.abs(value)));
  return <ul className="dashboard-breakdown">{rows.map(([name,value])=><li key={name}><div><span>{name}</span><strong>{money(value)}</strong></div><div className="dashboard-meter" aria-hidden="true"><span className={value<0?'negative':''} style={{width:`${100*Math.abs(value)/max}%`}}/></div></li>)}</ul>;
}
function TrendChart({rows=[],granularity,english,money,t}){
  const labels={hour:t('بالساعة','Hourly'),day:t('يومي','Daily'),week:t('أسبوعي','Weekly'),month:t('شهري','Monthly'),year:t('سنوي','Yearly')};
  const locale=english?'en-GB':'ar-EG',dayFormat=new Intl.DateTimeFormat(locale,{timeZone:'UTC',...(granularity==='hour'?{hour:'2-digit',minute:'2-digit'}:granularity==='year'?{year:'numeric'}:granularity==='month'?{month:'short',year:'2-digit'}:{day:'numeric',month:'short'})});
  const dailyData=rows.map(row=>({
    date:row.bucket,
    dayName:dayFormat.format(new Date(row.bucket+'Z')),
    sales:Number(row.sales),
    profit:Number(row.profit),
  }));
  return <SalesTrendChart dailyData={dailyData} english={english} formatMoney={money} periodLabel={labels[granularity]}/>;
}
