import { neon } from "@neondatabase/serverless";
import { config } from "../config.js";
export function database() {
  const sql = neon(config().database);
  return {
    query: async (text, params = []) => sql.query(text, params),
    batch: async (items) =>
      sql.transaction(items.map(([s, p = []]) => sql.query(s, p))),
  };
}
