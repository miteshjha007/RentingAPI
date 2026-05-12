// Structured server logger for Next.js API routes.
// Dev:  coloured human-readable lines
// Prod: single-line JSON for log aggregation (Datadog, Logtail, etc.)

type Level = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

const IS_PROD = process.env.NODE_ENV === 'production'

const ANSI = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  DEBUG:  '\x1b[36m',   // cyan
  INFO:   '\x1b[32m',   // green
  WARN:   '\x1b[33m',   // yellow
  ERROR:  '\x1b[31m',   // red
  dim:    '\x1b[2m',
}

function ts(): string {
  return new Date().toISOString().split('T')[1].replace('Z', '')
}

function emit(level: Level, module: string, msg: string, meta?: Record<string, unknown>) {
  if (IS_PROD) {
    // JSON — one line, easy to parse with any log aggregator
    const entry = {
      ts:      new Date().toISOString(),
      level,
      module,
      msg,
      ...meta,
    }
    if (level === 'ERROR') console.error(JSON.stringify(entry))
    else if (level === 'WARN') console.warn(JSON.stringify(entry))
    else console.log(JSON.stringify(entry))
    return
  }

  // Dev: pretty print
  const color   = ANSI[level]
  const pad     = level.padEnd(5)
  const modPad  = module.padEnd(8)
  const metaStr = meta && Object.keys(meta).length ? ` ${ANSI.dim}${JSON.stringify(meta)}${ANSI.reset}` : ''
  const line    = `${ANSI.dim}[${ts()}]${ANSI.reset} ${color}${ANSI.bold}[${pad}]${ANSI.reset} ${ANSI.dim}[${modPad}]${ANSI.reset} ${msg}${metaStr}`

  if (level === 'ERROR') console.error(line)
  else if (level === 'WARN') console.warn(line)
  else console.log(line)
}

interface Logger {
  debug: (msg: string, meta?: Record<string, unknown>) => void
  info:  (msg: string, meta?: Record<string, unknown>) => void
  warn:  (msg: string, meta?: Record<string, unknown>) => void
  error: (msg: string, meta?: Record<string, unknown>) => void
}

function makeLogger(module: string): Logger {
  return {
    debug: (msg, meta) => { if (!IS_PROD) emit('DEBUG', module, msg, meta) },
    info:  (msg, meta) => emit('INFO',  module, msg, meta),
    warn:  (msg, meta) => emit('WARN',  module, msg, meta),
    error: (msg, meta) => emit('ERROR', module, msg, meta),
  }
}

// Request-scoped logger — includes method, path, timing
export function reqLogger(method: string, path: string) {
  const start = Date.now()
  const L     = makeLogger('ROUTE')
  L.info(`→ ${method} ${path}`)
  return {
    ok:  (status = 200, meta?: Record<string, unknown>) =>
           L.info(`← ${method} ${path} ${status}`, { ms: Date.now() - start, ...meta }),
    fail:(status: number, error: string) =>
           L.warn(`← ${method} ${path} ${status}`, { ms: Date.now() - start, error }),
    boom:(error: unknown) =>
           L.error(`← ${method} ${path} 500`, { ms: Date.now() - start, error: String(error) }),
  }
}

export const log = {
  route: makeLogger('ROUTE'),
  db:    makeLogger('DB'),
  auth:  makeLogger('AUTH'),
  push:  makeLogger('PUSH'),
  module: makeLogger,
}
