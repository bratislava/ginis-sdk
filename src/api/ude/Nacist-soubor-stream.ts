import axios, { isAxiosError } from 'axios'
import { Readable, Transform, TransformCallback } from 'stream'

import { Ginis } from '../../ginis'
import { GinisError } from '../../utils/errors'
import {
  createXmlRequestBody,
  createXmlRequestConfig,
  extractResponseJson,
  RequestParamOrder,
  RequestParamType,
} from '../../utils/request-util'
import { nacistSouborResponseSchema } from './Nacist-soubor'

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

const DATA_OPEN = '<Data>'
const DATA_CLOSE = '</Data>'
const DATA_PLACEHOLDER = '<Data>placeholder</Data>'

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
 *
 * How it works — two things happen simultaneously:
 *
 * **Streaming binary data** (the main pipeline):
 *   Chunks between `<Data>` and `</Data>` are base64-decoded on the fly and
 *   pushed downstream via `this.push()`. The consumer can start piping as soon
 *   as the promise resolves.
 *
 * **Building a skeleton XML for validation** (runs alongside):
 *   The parser builds a "skeleton" copy of the full XML response, but with the
 *   huge base64 blob replaced by a tiny placeholder: `<Data>placeholder</Data>`.
 *   This skeleton is a few hundred bytes regardless of file size. When the stream
 *   ends, `_flush` feeds the skeleton through `extractResponseJson` + the same
 *   zod schema used by the non-streaming `nacistSoubor` — validating envelope
 *   structure, SOAP faults, required fields, etc. If validation fails, the
 *   stream emits an error so the consumer knows the response was invalid.
 *
 * Four-state machine:
 *
 * 1. `header` — Buffers everything before `<Data>` (a few hundred bytes).
 *    Once `<Data>` is found, saves the header to the skeleton with a
 *    placeholder, resolves the outer promise with `this` (the readable side
 *    of this Transform), and transitions to `data`.
 *
 * 2. `data` — Receives raw base64 text in HTTP-sized chunks (~16-64 KB).
 *    Decodes each chunk to binary and pushes it downstream. Nothing is added
 *    to the skeleton (the base64 blob is skipped). Keeps a small tail buffer
 *    (6 bytes) to safely detect `</Data>` split across chunks, and a base64
 *    remainder (0-3 chars) for 4-char alignment.
 *
 * 3. `tail` — Collects the XML closing tags after `</Data>` into the skeleton.
 *
 * 4. `done` — Reached after `_flush` validates the skeleton. All chunks discarded.
 *
 * Memory usage is O(1) regardless of file size — only the small skeleton and
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
  /**
   * A lightweight copy of the full XML response with the huge base64 content
   * replaced by `<Data>placeholder</Data>`. Used in `_flush` for zod validation
   * of the SOAP envelope structure without holding the actual file data in memory.
   */
  private skeleton = ''
  private state: 'header' | 'data' | 'tail' | 'done' = 'header'

  /**
   * The parser is constructed with the outer Promise's resolve/reject so it
   * can settle the promise at the right moment (when `<Data>` is found and
   * data starts streaming, or when the response indicates a missing file / error).
   */
  private resolvePromise: ((result: Readable | null) => void) | null
  private rejectPromise: ((error: Error) => void) | null

  constructor(resolve: (result: Readable | null) => void, reject: (error: Error) => void) {
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
      } else if (this.state === 'tail') {
        // Collect closing XML tags for skeleton validation
        this.skeleton += str
      }
      // state === 'done': discard

      callback()
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)))
    }
  }

  /**
   * Called when the input stream ends. Validates the skeleton XML using
   * `extractResponseJson` with the same zod schema as the non-streaming
   * `nacistSoubor`. If the SOAP envelope is malformed, contains a fault,
   * or is missing required fields, the stream emits an error.
   *
   * Validation runs _after_ all data chunks have been pushed but _before_
   * the 'end' event — so the consumer's error handler will fire if it fails.
   *
   * For the `header` state (stream ended before `<Data>` was found), the full
   * response is small — we use `headerBuf` directly as the skeleton. The zod
   * validation will detect SOAP faults, empty Xrg, missing fields, etc.
   */
  override _flush(callback: TransformCallback) {
    if (this.state === 'header') {
      // Never found <Data> — the entire response is small, use it as the skeleton
      this.skeleton = this.headerBuf
      callback(new GinisError('Response stream ended before <Data> was found'))
      return
    }

    if (this.state === 'data') {
      // Stream truncated before </Data> — flush remaining base64 to give the
      // consumer what we have, then fail with an explicit error.
      this.decodeBase64(this.tailBuf)
      this.flushBase64()
      this.tailBuf = ''
      callback(new GinisError('Response stream ended before </Data> was found'))
      return
    }

    // Validate the skeleton XML with the same zod schema used by the
    // non-streaming nacistSoubor. This catches SOAP faults, missing fields,
    // or unexpected envelope structure.
    extractResponseJson(this.skeleton, 'Nacist-soubor', nacistSouborResponseSchema)
      .then((result) => {
        // If the promise hasn't been settled yet (header state — no <Data> found),
        // resolve based on whether Nacist-soubor is present in the validated result.
        if (!result['Nacist-soubor']) {
          this.resolve(null)
        }
        callback()
      })
      .catch((err: unknown) => {
        // Reject the promise if it hasn't been settled yet (header/error states)
        this.reject(err instanceof GinisError ? err : new GinisError(String(err)))
        callback(err instanceof Error ? err : new Error(String(err)))
      })
  }

  /**
   * Accumulates the XML header. Once `<Data>` is found, saves everything
   * before it to the skeleton (with a placeholder instead of actual base64),
   * resolves the outer promise so the consumer can start piping, and
   * transitions to the `data` state.
   */
  private handleHeader(str: string) {
    this.headerBuf += str

    const idx = this.headerBuf.indexOf(DATA_OPEN)
    if (idx === -1) return

    // Split: everything after "<Data>" is base64 content
    const afterData = this.headerBuf.substring(idx + DATA_OPEN.length)

    // Build skeleton: XML header up to <Data>, then a lightweight placeholder
    // instead of the huge base64 blob. The closing tags will be appended in
    // the `tail` state and in `handleData` when </Data> is found.
    this.skeleton = this.headerBuf.substring(0, idx) + DATA_PLACEHOLDER
    this.headerBuf = ''

    this.state = 'data'
    // Resolve now — the consumer can start piping from this Transform's
    // readable side while we continue pushing decoded chunks into it.
    this.resolve(this)

    // The chunk that contained <Data> may also contain the first bytes of
    // base64 content — process them immediately.
    if (afterData.length > 0) {
      this.handleData(afterData)
    }
  }

  /**
   * Processes a chunk of base64 text from inside `<Data>…</Data>`.
   * Prepends the previous tail buffer and checks for the closing tag.
   * When `</Data>` is found, appends the trailing XML to the skeleton
   * and transitions to the `tail` state.
   */
  private handleData(str: string) {
    const combined = this.tailBuf + str

    const closeIdx = combined.indexOf(DATA_CLOSE)
    if (closeIdx !== -1) {
      // Found </Data> — decode everything before it
      this.decodeBase64(combined.substring(0, closeIdx))
      this.flushBase64()
      this.tailBuf = ''

      // Append the XML closing tags after </Data> to the skeleton
      this.skeleton += combined.substring(closeIdx + DATA_CLOSE.length)
      this.state = 'tail'
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

  private resolve(result: Readable | null) {
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
 * 2. Pipes the response through {@link NacistSouborXmlParser}, which does two things
 *    simultaneously:
 *    - **Streams binary data:** base64-decodes `<Data>` content on the fly and pushes
 *      decoded binary chunks downstream for the consumer to pipe.
 *    - **Builds a skeleton XML:** collects the entire SOAP envelope *except* the base64
 *      blob (replaced with a placeholder). When the stream ends, validates this skeleton
 *      using `extractResponseJson` + the same zod schema as `nacistSoubor`.
 * 3. Returns a `Readable` stream emitting decoded binary chunks. The consumer (e.g. a
 *    Next.js API route) can pipe this directly to the HTTP response — the file is never
 *    fully held in memory. Returns `null` when the file is not found.
 *
 * **Validation:** The skeleton XML is validated in `_flush` (after all data is pushed,
 * before the `'end'` event). If validation fails, the stream emits `'error'` — the
 * consumer's error handler fires and can act accordingly.
 *
 * **Backpressure:** The Transform stream handles backpressure automatically — if the
 * consumer reads slowly, Node.js pauses the upstream HTTP response accordingly.
 *
 * @param bodyObj - Request parameters, typically `{ 'Id-souboru': fileId }`.
 * @returns A `Readable` stream of decoded binary data if the file exists, `null` if not found.
 * @throws {GinisError} On network errors, SOAP faults, or malformed responses.
 */
export async function nacistSouborStream(
  this: Ginis,
  bodyObj: UdeNacistSouborStreamRequest
): Promise<Readable | null> {
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

  // The promise resolves once the parser finds <Data> and is ready to stream,
  // or resolves with null / rejects if the response indicates a missing file or error.
  return new Promise<Readable | null>((resolve, reject) => {
    const parser = new NacistSouborXmlParser(resolve, reject)

    // Propagate HTTP stream errors to the parser
    responseStream.on('error', (err) => {
      parser.destroy(err)
      reject(new GinisError(`GINIS response stream error: ${err.message}`))
    })

    // Propagate parser errors back (e.g. malformed XML, failed skeleton validation)
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
