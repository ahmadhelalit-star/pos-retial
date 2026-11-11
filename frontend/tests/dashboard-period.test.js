import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardPeriodBounds,todayDashboardPeriod,dashboardTrendGranularity,dashboardTrendPoints} from '../../shared/dashboard-period.js';

test('today is the Cairo calendar day and the ending minute is included',()=>{
  const period=todayDashboardPeriod(new Date('2026-11-10T22:01:00Z'));
  assert.equal(period.dateFrom,'2026-11-11');
  assert.deepEqual(dashboardPeriodBounds(period),{from:'2026-11-10T22:00:00.000Z',to:'2026-11-11T22:00:00.000Z'});
  assert.deepEqual(dashboardPeriodBounds({...period,timeFrom:'10:25',timeTo:'10:25'}),{from:'2026-11-11T08:25:00.000Z',to:'2026-11-11T08:26:00.000Z'});
});
test('Cairo daylight-saving transitions keep the whole calendar day',()=>{
  const spring={dateFrom:'2026-04-24',dateTo:'2026-04-24',timeFrom:'00:00',timeTo:'23:59'};
  const fall={...spring,dateFrom:'2026-10-29',dateTo:'2026-10-29'};
  for(const [period,hours] of [[spring,23],[fall,25]]){
    const {from,to}=dashboardPeriodBounds(period);assert.equal((Date.parse(to)-Date.parse(from))/3600000,hours);assert.equal(dashboardTrendGranularity(from,to),'hour');
  }
  assert.equal(dashboardPeriodBounds({...spring,timeFrom:'00:30'}),null);
});
test('invalid dates and reversed periods cannot trigger requests; granularity grows with range',()=>{
  const period={dateFrom:'2026-01-01',dateTo:'2026-01-01',timeFrom:'12:00',timeTo:'11:00'};
  assert.equal(dashboardPeriodBounds(period),null);
  assert.equal(dashboardPeriodBounds({...period,dateFrom:'2026-02-30',dateTo:'2026-03-02'}),null);
  for(const [dateTo,expected] of [['2026-02-01','day'],['2026-05-01','week'],['2027-01-01','month'],['2029-01-01','year']]){
    const {from,to}=dashboardPeriodBounds({...period,dateTo});assert.equal(dashboardTrendGranularity(from,to),expected);
  }
});

test('chart keeps the selected timeline and inserts zeros without changing report amounts',()=>{
  const bounds=dashboardPeriodBounds({dateFrom:'2026-11-11',dateTo:'2026-11-11',timeFrom:'10:30',timeTo:'12:15'});
  const row={bucket:'2026-11-11T11:00',sales:'52.20',profit:'-3.20'};
  assert.deepEqual(dashboardTrendPoints([row],bounds,'hour'),[
    {bucket:'2026-11-11T10:00',sales:0,profit:0},row,{bucket:'2026-11-11T12:00',sales:0,profit:0}
  ]);
});
