export const dashboardTimeZone='Africa/Cairo';
const calendar=new Intl.DateTimeFormat('en-GB',{timeZone:dashboardTimeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const dayMs=86400000,minuteMs=60000;

export function cairoMinute(instant){
  const parts=Object.fromEntries(calendar.formatToParts(instant).map(({type,value})=>[type,value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function todayDashboardPeriod(now=new Date()){
  const date=cairoMinute(now).slice(0,10);
  return {dateFrom:date,dateTo:date,timeFrom:'00:00',timeTo:'23:59'};
}

function localMinuteCandidates(value){
  if(!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))return [];
  const wall=Date.parse(value+'Z');
  if(!Number.isFinite(wall)||new Date(wall).toISOString().slice(0,16)!==value)return [];
  // Inspect both offsets around a clock change and verify the resulting local minute.
  return [...new Set([-dayMs,0,dayMs].map(delta=>{
    const sample=wall+delta,offset=Date.parse(cairoMinute(new Date(sample))+'Z')-sample;
    return wall-offset;
  }))].filter(instant=>cairoMinute(new Date(instant))===value).sort((a,b)=>a-b);
}

export function dashboardPeriodBounds(period){
  if(!period)return null;
  const start=`${period.dateFrom}T${period.timeFrom}`,end=`${period.dateTo}T${period.timeTo}`;
  if(start>end)return null;
  let first=localMinuteCandidates(start)[0];
  // On the Cairo spring clock change the calendar day starts at 01:00.
  if(first===undefined&&period.timeFrom==='00:00')first=localMinuteCandidates(`${period.dateFrom}T01:00`)[0];
  const last=localMinuteCandidates(end).at(-1);
  if(first===undefined||last===undefined||first>last)return null;
  return {from:new Date(first).toISOString(),to:new Date(last+minuteMs).toISOString()};
}

export function dashboardTrendGranularity(from,to){
  const start=cairoMinute(new Date(from)).slice(0,10),end=cairoMinute(new Date(Date.parse(to)-1)).slice(0,10);
  const days=(Date.parse(end)-Date.parse(start))/dayMs+1;
  return days===1?'hour':days<=60?'day':days<=183?'week':days<=731?'month':'year';
}

export function dashboardTrendPoints(rows,bounds,granularity){
  if(!rows.length||!bounds||!['hour','day','week','month','year'].includes(granularity))return rows;
  const cursor=new Date(cairoMinute(new Date(bounds.from))+'Z');
  const end=new Date(cairoMinute(new Date(Date.parse(bounds.to)-1))+'Z');
  cursor.setUTCMinutes(0);
  if(granularity!=='hour')cursor.setUTCHours(0);
  if(granularity==='week')cursor.setUTCDate(cursor.getUTCDate()-(cursor.getUTCDay()+6)%7);
  if(granularity==='month')cursor.setUTCDate(1);
  if(granularity==='year')cursor.setUTCMonth(0,1);
  const byBucket=new Map(rows.map(row=>[row.bucket,row])),points=[];
  while(cursor<=end&&points.length<=120){
    const bucket=cursor.toISOString().slice(0,16);
    points.push(byBucket.get(bucket)??{bucket,sales:0,profit:0});
    if(granularity==='hour')cursor.setUTCHours(cursor.getUTCHours()+1);
    else if(granularity==='month')cursor.setUTCMonth(cursor.getUTCMonth()+1);
    else if(granularity==='year')cursor.setUTCFullYear(cursor.getUTCFullYear()+1);
    else cursor.setUTCDate(cursor.getUTCDate()+(granularity==='week'?7:1));
  }
  return points.length>120?rows:points;
}
