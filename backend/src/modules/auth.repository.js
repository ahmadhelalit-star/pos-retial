export async function loadUser(db, id) {
  const user = (await db.query(`SELECT id,company_id AS "companyId",username,name,active FROM users WHERE id=$1 AND active`, [id])).rows[0];
  if (!user) return null;
  user.permissions = (await db.query('SELECT DISTINCT rp.permission_id FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id WHERE ur.user_id=$1', [id])).rows.map((row) => row.permission_id);
  user.roles = (await db.query('SELECT r.id,r.name,r.is_admin FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1', [id])).rows;
  user.branches = (await db.query('SELECT branch_id FROM user_branches WHERE user_id=$1', [id])).rows.map((row) => row.branch_id);
  user.warehouses = (await db.query('SELECT warehouse_id FROM user_warehouses WHERE user_id=$1', [id])).rows.map((row) => row.warehouse_id);
  return user;
}
