// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { Pool } from "pg";

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "Test",
  password: "admin@123",
  port: 5432,
});

const notReturningQuery = ["select", "create"];

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const body = JSON.parse(req.body);
      if (
        !notReturningQuery.includes(
          body.query.trim().toLowerCase().split(" ")[0]
        )
      ) {
        const resp = await pool.query(body.query + " RETURNING *");
        res.status(200).json(resp.rows);
      } else {
        const resp = await pool.query(body.query);
        res.status(200).json(resp.rows);
      }
    } else {
      const resp = await pool.query(
        `select table_schema||'.'||table_name as table_fullname from information_schema."tables" where table_type = 'BASE TABLE'
        and table_schema not in ('pg_catalog', 'information_schema')`
      );
      res.status(200).json(resp.rows);
    }
  } catch (error) {
    res.status(500).json({ error: `Something went wrong!,${error}` });
  }
}
