// Structured logger — all logs include timestamp + module prefix.
// Usage:
//   import { log } from '@/lib/logger'
//   const L = log.module('AUTH')
//   L.info('Sending OTP', { phone })
//   L.error('OTP failed', error)

type Level = 'DEBUG' | 'INFO ' | 'WARN ' | 'ERROR'

function timestamp(): string {
  return new Date().toISOString().split('T')[1].replace('Z', '')
}

function emit(level: Level, module: string, msg: string, data?: unknown): void {
  const prefix = `[${timestamp()}] [${module.padEnd(7)}] [${level}]`
  if (level === 'ERROR') {
    console.error(prefix, msg, data !== undefined ? data : '')
  } else if (level === 'WARN ') {
    console.warn(prefix, msg, data !== undefined ? data : '')
  } else if (level === 'DEBUG') {
    if (__DEV__) console.log(prefix, msg, data !== undefined ? data : '')
  } else {
    console.log(prefix, msg, data !== undefined ? data : '')
  }
}

interface Logger {
  debug: (msg: string, data?: unknown) => void
  info:  (msg: string, data?: unknown) => void
  warn:  (msg: string, data?: unknown) => void
  error: (msg: string, data?: unknown) => void
}

function module(name: string): Logger {
  return {
    debug: (msg, data) => emit('DEBUG', name, msg, data),
    info:  (msg, data) => emit('INFO ', name, msg, data),
    warn:  (msg, data) => emit('WARN ', name, msg, data),
    error: (msg, data) => emit('ERROR', name, msg, data),
  }
}

export const log = {
  module,
  // Pre-built loggers for common modules
  auth:  module('AUTH'),
  store: module('STORE'),
  nav:   module('NAV'),
  api:   module('API'),
  ui:    module('UI'),
}
