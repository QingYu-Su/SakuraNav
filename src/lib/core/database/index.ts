import { getDb } from "./connection";
import { initializeSchema } from "./schema";
import { runMigrations } from "./migrations";
import { seedDatabase } from "./seed";

export function initializeDatabase(): void {
  const db = getDb();
  initializeSchema(db);
  runMigrations(db);
  seedDatabase(db);
}

export { getDb } from "./connection";
