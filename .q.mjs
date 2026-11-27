import pg from "pg"; const c=new pg.Client({connectionString:process.env.DATABASE_URL_UNPOOLED}); await c.connect();
const r=await c.query(`select t.title,t.due_at,t.has_time from task t join "user" u on u.id=t.owner_id where u.email like 'delivered+p3%' order by t.created_at`); console.table(r.rows); await c.end();
