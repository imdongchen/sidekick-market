import {
  DEMO_AUTH_USER,
  DEMO_EMAIL_TRACKING,
  DEMO_PROFILES,
  DEMO_TEAMS,
  DEMO_WORKOUT_LOGS,
} from '@/lib/admin-demo-data'

type Row = Record<string, unknown>

type Filter = (row: Row) => boolean

type Order = { column: string; ascending: boolean }

const tables: Record<string, Row[]> = {
  profile: DEMO_PROFILES as unknown as Row[],
  team: DEMO_TEAMS as unknown as Row[],
  email_tracking: DEMO_EMAIL_TRACKING as unknown as Row[],
  workout_log: DEMO_WORKOUT_LOGS as unknown as Row[],
}

function cloneRows(name: string): Row[] {
  const rows = tables[name] ?? []
  return rows.map((row) => ({ ...row }))
}

function project(row: Row, columns: string | undefined): Row {
  if (!columns || columns.trim() === '*') return row
  const keys = columns.split(',').map((part) => part.trim())
  const out: Row = {}
  for (const key of keys) {
    if (key) out[key] = row[key]
  }
  return out
}

function like(value: unknown, pattern: string): boolean {
  const haystack = String(value ?? '').toLowerCase()
  const escaped = pattern
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.')
  return new RegExp(`^${escaped}$`).test(haystack)
}

function parseOrClause(clause: string): Filter {
  // PostgREST `or`: firstName.ilike.%foo%,lastName.ilike.%foo%
  const parts = clause
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  const matchers = parts.map((part) => {
    const match = part.match(/^([^.]+)\.([^.]+)\.(.*)$/)
    if (!match) return () => false
    const [, column, op, raw] = match
    return (row: Row) => matchOp(row[column], op, raw)
  })
  return (row) => matchers.some((fn) => fn(row))
}

function matchOp(value: unknown, op: string, raw: string): boolean {
  switch (op) {
    case 'eq':
      return String(value) === raw
    case 'neq':
      return String(value) !== raw
    case 'ilike':
      return like(value, raw)
    default:
      return false
  }
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (left == null && right == null) return true
  if (typeof left === 'number' || typeof right === 'number') {
    return Number(left) === Number(right)
  }
  return String(left) === String(right)
}

class DemoQuery {
  private filters: Filter[] = []
  private orders: Order[] = []
  private limitN: number | null = null
  private rangeFrom: number | null = null
  private rangeTo: number | null = null
  private columns: string | undefined
  private countExact = false
  private head = false
  private wantMaybeSingle = false

  constructor(private table: string) {}

  select(
    columns?: string,
    options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean },
  ) {
    this.columns = columns
    this.countExact = options?.count === 'exact'
    this.head = options?.head === true
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => valuesEqual(row[column], value))
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.push((row) => !valuesEqual(row[column], value))
    return this
  }

  in(column: string, values: unknown[]) {
    const set = new Set(values.map((value) => String(value)))
    this.filters.push((row) => set.has(String(row[column])))
    return this
  }

  ilike(column: string, pattern: string) {
    this.filters.push((row) => like(row[column], pattern))
    return this
  }

  or(expression: string) {
    this.filters.push(parseOrClause(expression))
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false })
    return this
  }

  limit(count: number) {
    this.limitN = count
    return this
  }

  range(from: number, to: number) {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  maybeSingle() {
    this.wantMaybeSingle = true
    return this
  }

  insert(values: Row | Row[]) {
    this.columns = undefined
    const rows = Array.isArray(values) ? values : [values]
    this.head = false
    this.wantMaybeSingle = false
    this._insertRows = rows
    return this
  }

  update(values: Row) {
    this._updateValues = values
    return this
  }

  private _insertRows: Row[] | null = null
  private _updateValues: Row | null = null

  private execute() {
    if (this._insertRows) {
      const store = tables[this.table] ?? (tables[this.table] = [])
      const withIds = this._insertRows.map((row, index) => {
        if (row.id != null) return { ...row }
        const nextId =
          store.reduce(
            (max, item) => Math.max(max, Number(item.id) || 0),
            0,
          ) +
          index +
          1
        return { ...row, id: nextId }
      })
      store.push(...withIds.map((row) => ({ ...row })))
      const projected = withIds.map((row) => project(row, this.columns))
      if (this.wantMaybeSingle) {
        return {
          data: projected[0] ?? null,
          error: null,
          count: projected.length,
          status: 201,
          statusText: 'Created',
        }
      }
      return {
        data: projected,
        error: null,
        count: withIds.length,
        status: 201,
        statusText: 'Created',
      }
    }

    let rows = cloneRows(this.table)
    for (const filter of this.filters) {
      rows = rows.filter(filter)
    }

    if (this._updateValues) {
      const store = tables[this.table] ?? []
      let matched = 0
      for (let i = 0; i < store.length; i++) {
        const row = store[i]
        if (this.filters.every((filter) => filter(row))) {
          store[i] = { ...row, ...this._updateValues }
          matched += 1
        }
      }
      const data = store
        .filter((row) => this.filters.every((filter) => filter(row)))
        .map((row) => project(row, this.columns))
      if (this.wantMaybeSingle) {
        return {
          data: data[0] ?? null,
          error: null,
          count: data.length,
          status: 200,
          statusText: 'OK',
        }
      }
      return {
        data,
        error: null,
        count: matched,
        status: 200,
        statusText: 'OK',
      }
    }

    const matchedCount = rows.length

    for (const order of this.orders) {
      rows.sort((a, b) => {
        const av = a[order.column]
        const bv = b[order.column]
        const as = av == null ? '' : String(av)
        const bs = bv == null ? '' : String(bv)
        const cmp = as.localeCompare(bs, undefined, { numeric: true })
        return order.ascending ? cmp : -cmp
      })
    }

    if (this.rangeFrom != null && this.rangeTo != null) {
      rows = rows.slice(this.rangeFrom, this.rangeTo + 1)
    } else if (this.limitN != null) {
      rows = rows.slice(0, this.limitN)
    }

    const projected = rows.map((row) => project(row, this.columns))
    const count = this.countExact ? matchedCount : null

    if (this.head) {
      return {
        data: null,
        error: null,
        count,
        status: 200,
        statusText: 'OK',
      }
    }

    if (this.wantMaybeSingle) {
      return {
        data: projected[0] ?? null,
        error: null,
        count: projected.length,
        status: 200,
        statusText: 'OK',
      }
    }

    return {
      data: projected,
      error: null,
      count,
      status: 200,
      statusText: 'OK',
    }
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?:
      | ((
          value: ReturnType<DemoQuery['execute']>,
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }
}

export function createDemoClient() {
  return {
    auth: {
      async getUser() {
        return {
          data: { user: DEMO_AUTH_USER },
          error: null,
        }
      },
      async signOut() {
        return { error: null }
      },
    },
    from(table: string) {
      return new DemoQuery(table)
    },
  }
}
