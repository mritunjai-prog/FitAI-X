import { Client } from 'pg';

async function main() {
  const client = new Client({ connectionString: 'postgresql://fitaix_user:fitaix_password@127.0.0.1:5432/fitaix_db' });
  try {
    await client.connect();
    console.log('Connected!');
    const res = await client.query('SELECT current_user, current_database();');
    console.log(res.rows);
    const tables = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
    console.log('Tables:', tables.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
main();
