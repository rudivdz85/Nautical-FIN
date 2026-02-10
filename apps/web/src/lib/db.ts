import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'

let _db: NeonHttpDatabase | undefined

export function getDb(): NeonHttpDatabase {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    const sql = neon(url)
    _db = drizzle(sql)
  }
  return _db
}

export const db = new Proxy({} as NeonHttpDatabase, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  },
})
