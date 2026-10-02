/**
 * Parsing of the text/event-stream format (pure, no browser or app imports, so it can be unit tested).
 */

export interface SseMessage {
  /** The `event:` name; "message" when the server sent none. */
  event: string
  data: string
}

/**
 * An incremental parser for the text/event-stream format: feed it text as it arrives, and it calls
 * `onMessage` for each complete event. Comment lines (": keep-alive") and `retry:` are read but not reported;
 * `onRetry` gets the server's reconnect delay.
 */
export function createSseParser(onMessage: (m: SseMessage) => void, onRetry?: (ms: number) => void) {
  let buffer = ''
  let event = ''
  let data: string[] = []

  const line = (raw: string) => {
    if (raw === '') {
      const joined = data.join('\n')
      if (joined !== '') onMessage({ event: event || 'message', data: joined })
      event = ''
      data = []
      return
    }
    if (raw.startsWith(':')) return
    const colon = raw.indexOf(':')
    const field = colon < 0 ? raw : raw.slice(0, colon)
    let value = colon < 0 ? '' : raw.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') event = value
    else if (field === 'data') data.push(value)
    else if (field === 'retry' && /^\d+$/.test(value)) onRetry?.(Number(value))
  }

  return (chunk: string) => {
    buffer += chunk
    let at: number
    // A line ends at \n, \r\n or a lone \r; a trailing \r may be the first half of \r\n, so it waits.
    while ((at = buffer.search(/\r\n|\n|\r(?!$)/)) >= 0) {
      const end = buffer[at] === '\r' && buffer[at + 1] === '\n' ? at + 2 : at + 1
      line(buffer.slice(0, at))
      buffer = buffer.slice(end)
    }
  }
}
