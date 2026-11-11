import {dashboardTimeZone,dashboardTrendGranularity} from '../../../shared/dashboard-period.js';

export async function dashboardTrend(db,values){
  const granularity=dashboardTrendGranularity(values[2],values[3]);
  const trend=(await db.query(`SELECT to_char(date_trunc($5::text,created_at AT TIME ZONE $6::text),'YYYY-MM-DD"T"HH24:MI') bucket,
    sum(CASE WHEN kind='sale' THEN total_base ELSE -total_base END) sales,
    sum((CASE WHEN kind='sale' THEN 1 ELSE -1 END)*((subtotal-discount)*exchange_rate-cost_base)) profit
    FROM commercial_documents WHERE company_id=$1 AND warehouse_id=ANY($2::uuid[]) AND kind IN('sale','sale_return')
      AND created_at>=$3 AND created_at<$4 GROUP BY 1 ORDER BY 1`,[...values,granularity,dashboardTimeZone])).rows;
  return {trend,granularity};
}
