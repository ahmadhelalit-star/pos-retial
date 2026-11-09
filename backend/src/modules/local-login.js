import {fail} from '../http/errors.js';
export function registerLocalLogin(app,{pool,licenseProvider}){
 app.get('/api/auth/accounts',async(_req,res)=>{
  const state=await licenseProvider();if(state.status!=='ACTIVE'||state.activated!==true||state.product!=='retail')fail(403,'ACTIVATION_REQUIRED','Activate Retail first',{activationStatus:state.status});
  const company=(await pool.query('SELECT id,name FROM companies ORDER BY created_at,id LIMIT 1')).rows[0];if(!company)return res.json({items:[],branding:{name:'Sham Touch Retail'}});
  const items=(await pool.query(`SELECT u.id,u.name,EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id AND r.company_id=ur.company_id WHERE ur.company_id=u.company_id AND ur.user_id=u.id AND r.is_admin) AS "isAdmin" FROM users u WHERE u.company_id=$1 AND u.active ORDER BY lower(u.name),u.id`,[company.id])).rows;
  res.json({items,branding:{name:company.name}});
 });
}
