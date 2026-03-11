import axios, { isAxiosError } from 'axios'
import { Readable, Transform, TransformCallback } from 'stream'

import { Ginis } from '../../ginis'
import { GinisError } from '../../utils/errors'
import {
  createXmlRequestBody,
  createXmlRequestConfig,
  RequestParamOrder,
  RequestParamType,
} from '../../utils/request-util'

const nacistSouborRequestProperties = ['Id-souboru'] as const

export type UdeNacistSouborStreamRequest = {
  [K in (typeof nacistSouborRequestProperties)[number] as K]?: RequestParamType
}

const nacistSouborParamOrders: RequestParamOrder[] = [
  {
    name: 'Nacist-soubor',
    params: nacistSouborRequestProperties,
  },
]

export interface NacistSouborStreamResult {
  filename: string
  dataStream: Readable
}

const DATA_OPEN = '<Data>'
const DATA_CLOSE = '</Data>'
const FILENAME_RE = /<Jmeno-souboru>([^<]+)<\/Jmeno-souboru>/
const SOAP_FAULT_RE = /<faultstring>([^<]*)<\/faultstring>/

/**
 * Streaming XML parser for GINIS Nacist-soubor SOAP responses.
 *
 * The GINIS response XML has this structure (all on one line, no whitespace):
 *   <s:Envelope>
 *     <s:Header>…</s:Header>
 *     <s:Body>
 *       <Nacist-souborResponse>
 *         <Nacist-souborResult>
 *           <Xrg>
 *             <Nacist-soubor>
 *               <Jmeno-souboru>filename.pdf</Jmeno-souboru>
 *               <Data>...huge base64 blob...</Data>
 *             </Nacist-soubor>
 *           </Xrg>
 *         </Nacist-souborResult>
 *       </Nacist-souborResponse>
 *     </s:Body>
 *   </s:Envelope>
 *
 * Why a custom parser instead of a library (sax, saxes, htmlparser2)?
 * All popular streaming XML parsers buffer the full text content of an element
 * before emitting `ontext`. For the <Data> element (hundreds of MB of base64),
 * that would load everything into memory — defeating the purpose of streaming.
 *
 * How it works — three-state machine:
 *
 * 1. `header` — Buffers everything before <Data> (a few hundred bytes).
 *    Extracts the filename from <Jmeno-souboru>. Once <Data> is found,
 *    resolves the outer promise with `{ filename, dataStream: this }` so the
 *    consumer can start piping immediately, then transitions to `data`.
 *
 * 2. `data` — Receives raw base64 text in HTTP-sized chunks (~16-64 KB).
 *    Decodes each chunk to binary and pushes it downstream via `this.push()`.
 *    Keeps a small tail buffer (6 bytes) to safely detect `</Data>` even when
 *    the closing tag is split across two chunks. Also keeps a base64 remainder
 *    (0-3 chars) because base64 must be decoded in multiples of 4 characters.
 *
 * 3. `done` — All remaining chunks are discarded (just the XML closing tags).
 *
 * Memory usage is O(1) regardless of file size — only the small header and
 * fixed-size tail/remainder buffers are kept in memory.
 */
class NacistSouborXmlParser extends Transform {
  /** Accumulates XML bytes before <Data> — only a few hundred bytes. */
  private headerBuf = ''
  /**
   * Holds the last 6 chars of each data chunk. This is needed because
   * `</Data>` (7 chars) could be split across two HTTP chunks — without
   * this buffer we might accidentally decode part of the closing tag as base64.
   */
  private tailBuf = ''
  /**
   * Holds 0-3 leftover base64 characters between chunks. Base64 decoding
   * requires input lengths that are multiples of 4, so any remainder from
   * the previous chunk is prepended to the next one.
   */
  private base64Rem = ''
  private state: 'header' | 'data' | 'done' = 'header'
  public filename: string | null = null

  /**
   * The parser is constructed with the outer Promise's resolve/reject so it
   * can settle the promise at the right moment (when filename + data stream
   * are ready, or when an error / empty response is detected).
   */
  private resolvePromise: ((result: NacistSouborStreamResult | null) => void) | null
  private rejectPromise: ((error: Error) => void) | null

  constructor(
    resolve: (result: NacistSouborStreamResult | null) => void,
    reject: (error: Error) => void
  ) {
    super()
    this.resolvePromise = resolve
    this.rejectPromise = reject
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
    try {
      const str = chunk.toString('utf-8')

      if (this.state === 'header') {
        this.handleHeader(str)
      } else if (this.state === 'data') {
        this.handleData(str)
      }
      // state === 'done': discard remaining XML closing tags

      callback()
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)))
    }
  }

  /**
   * Called when the input stream ends. If we never found <Data>, the file
   * doesn't exist (empty <Xrg/>) or the response is a SOAP fault.
   */
  override _flush(callback: TransformCallback) {
    if (this.state === 'header') {
      const faultMatch = SOAP_FAULT_RE.exec(this.headerBuf)
      if (faultMatch) {
        this.reject(new GinisError(`SOAP Fault: ${faultMatch[1]}`))
      } else if (!this.filename) {
        // Empty <Xrg/> — file not found
        this.resolve(null)
      } else {
        this.reject(new GinisError('Found <Jmeno-souboru> but no <Data> in response'))
      }
    } else if (this.state === 'data') {
      // Stream ended mid-data (shouldn't happen with valid responses) — flush what we have
      this.decodeBase64(this.tailBuf)
      this.flushBase64()
      this.tailBuf = ''
    }
    callback()
  }

  /**
   * Accumulates the XML header. Once <Data> is found, extracts everything
   * after it (which is the start of the base64 blob) and transitions to
   * the `data` state. The promise is resolved here so the consumer can
   * start piping from `dataStream` while data is still arriving.
   */
  private handleHeader(str: string) {
    this.headerBuf += str

    // <Jmeno-souboru> always appears before <Data> in the response
    if (!this.filename) {
      const match = FILENAME_RE.exec(this.headerBuf)
      if (match?.[1]) this.filename = match[1]
    }

    const idx = this.headerBuf.indexOf(DATA_OPEN)
    if (idx === -1) return

    // Split: everything after "<Data>" is base64 content
    const afterData = this.headerBuf.substring(idx + DATA_OPEN.length)
    this.headerBuf = ''

    if (!this.filename) {
      this.reject(new GinisError('Found <Data> before <Jmeno-souboru> in XML response'))
      this.state = 'done'
      return
    }

    this.state = 'data'
    // Resolve now — the consumer can start piping from this Transform's
    // readable side while we continue pushing decoded chunks into it.
    this.resolve({ filename: this.filename, dataStream: this })

    // The chunk that contained <Data> may also contain the first bytes of
    // base64 content — process them immediately.
    if (afterData.length > 0) {
      this.handleData(afterData)
    }
  }

  /**
   * Processes a chunk of base64 text from inside <Data>…</Data>.
   * Prepends the previous tail buffer and checks for the closing tag.
   */
  private handleData(str: string) {
    const combined = this.tailBuf + str

    const closeIdx = combined.indexOf(DATA_CLOSE)
    if (closeIdx !== -1) {
      // Found </Data> — decode everything before it and we're done
      this.decodeBase64(combined.substring(0, closeIdx))
      this.flushBase64()
      this.tailBuf = ''
      this.state = 'done'
      return
    }

    // No closing tag yet. Hold back the last 6 chars as a tail buffer so we
    // don't miss </Data> if it's split across this chunk and the next one.
    // (DATA_CLOSE is 7 chars, so a 6-char tail guarantees the tag won't be
    // partially consumed as base64.)
    const tailSize = DATA_CLOSE.length - 1
    if (combined.length > tailSize) {
      this.decodeBase64(combined.substring(0, combined.length - tailSize))
      this.tailBuf = combined.substring(combined.length - tailSize)
    } else {
      this.tailBuf = combined
    }
  }

  /**
   * Decodes a chunk of base64 text to binary and pushes it downstream.
   * Only decodes up to the last multiple-of-4 boundary; leftover chars
   * (0-3) are saved in `base64Rem` and prepended to the next chunk.
   */
  private decodeBase64(str: string) {
    if (str.length === 0) return

    const full = this.base64Rem + str
    const aligned = full.length - (full.length % 4)
    if (aligned > 0) {
      this.push(Buffer.from(full.substring(0, aligned), 'base64'))
    }
    this.base64Rem = full.substring(aligned)
  }

  /** Decodes and pushes any remaining base64 chars (final padding). */
  private flushBase64() {
    if (this.base64Rem.length > 0) {
      this.push(Buffer.from(this.base64Rem, 'base64'))
      this.base64Rem = ''
    }
  }

  private resolve(result: NacistSouborStreamResult | null) {
    this.resolvePromise?.(result)
    this.resolvePromise = null
    this.rejectPromise = null
  }

  private reject(error: Error) {
    this.rejectPromise?.(error)
    this.resolvePromise = null
    this.rejectPromise = null
  }
}

/**
 * Streaming variant of {@link nacistSoubor} for downloading files from the
 * GINIS UDE (Úřední deska) service.
 *
 * **Why this exists:** The non-streaming version loads the entire SOAP XML
 * response into memory, parses it with xml2js, then base64-decodes the file.
 * For large files (50-200+ MB) this causes memory spikes of several GB
 * (the base64 string + parsed object + decoded buffer all coexist in memory).
 *
 * **How it works:**
 * 1. Sends the same SOAP request as `nacistSoubor`, but with `responseType: 'stream'`
 *    so axios returns a Node.js Readable instead of buffering the entire response.
 * 2. Pipes the response through {@link NacistSouborXmlParser}, which extracts the
 *    filename from `<Jmeno-souboru>` and base64-decodes `<Data>` content on the fly.
 * 3. Returns `{ filename, dataStream }` where `dataStream` is a Readable emitting
 *    decoded binary chunks. The consumer (e.g. a Next.js API route) can pipe this
 *    directly to the HTTP response — the file is never fully held in memory.
 *
 * **Backpressure:** The Transform stream handles backpressure automatically — if the
 * consumer reads slowly, Node.js pauses the upstream HTTP response accordingly.
 *
 * @param bodyObj - Request parameters, typically `{ 'Id-souboru': fileId }`.
 * @returns `{ filename, dataStream }` if the file exists, `null` if not found.
 * @throws {GinisError} On network errors, SOAP faults, or malformed responses.
 */
export async function nacistSouborStream(
  this: Ginis,
  bodyObj: UdeNacistSouborStreamRequest
): Promise<NacistSouborStreamResult | null> {
  const url = this.config.urls.ude
  if (!url) throw new GinisError('GINIS SDK Error: Missing UDE url in GINIS config')

  const requestName = 'Nacist-soubor'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ude/v_1.0.0.0'

  const xmlConfig = createXmlRequestConfig(requestName, requestNamespace)
  const xmlBody = createXmlRequestBody(this.config, {
    name: requestName,
    namespace: requestNamespace,
    xrgNamespace: 'http://www.gordic.cz/xrg/ude/nacist-soubor/request/v_1.0.0.0',
    paramsBodies: [bodyObj],
    paramOrders: nacistSouborParamOrders,
  })

  if (this.config.debug) {
    console.log('########### GINIS STREAM REQUEST ###########')
    console.log('headers: ', xmlConfig.headers)
    console.log('body: ', xmlBody)
    console.log('########### GINIS STREAM REQUEST END ###########')
  }

  // responseType: 'stream' tells axios to return the raw HTTP response as a
  // Node.js Readable instead of buffering the entire body into a string/object.
  let responseStream: Readable
  try {
    const response = await axios.post(url, xmlBody, {
      ...xmlConfig,
      responseType: 'stream',
    })
    responseStream = response.data as Readable
  } catch (error) {
    if (isAxiosError(error)) {
      throw new GinisError(`GINIS request failed: ${error.message}`, error)
    }
    throw error
  }

  // The promise resolves once the parser has extracted the filename and is
  // ready to stream data, or resolves with null / rejects if the response
  // indicates a missing file or an error.
  return new Promise<NacistSouborStreamResult | null>((resolve, reject) => {
    const parser = new NacistSouborXmlParser(resolve, reject)

    // Propagate HTTP stream errors to the parser
    responseStream.on('error', (err) => {
      parser.destroy(err)
      reject(new GinisError(`GINIS response stream error: ${err.message}`))
    })

    // Propagate parser errors back (e.g. malformed XML)
    parser.on('error', (err) => {
      responseStream.destroy()
      reject(err instanceof GinisError ? err : new GinisError(err.message))
    })

    // When the parser finishes or is destroyed, tear down the HTTP connection
    parser.on('close', () => {
      if (!responseStream.destroyed) responseStream.destroy()
    })

    // Connect the HTTP response stream to the parser's writable side.
    // Decoded binary data flows out of the parser's readable side (dataStream).
    responseStream.pipe(parser)
  })
}
