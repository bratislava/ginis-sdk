import { pipeline, Readable, Transform, TransformCallback } from 'stream'

import { Ginis } from '../../ginis'
import { makeAxiosRequest } from '../../utils/api'
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
const DATA_PLACEHOLDER = `${DATA_OPEN}placeholder${DATA_CLOSE}`

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
 * How it works — two things happen simultaneously:
 *
 * **Streaming binary data** (the main pipeline):
 *   Chunks between `<Data>` and `</Data>` are base64-decoded on the fly and
 *   pushed downstream via `this.push()`. The consumer can start piping as soon
 *   as the `'ready'` event fires.
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
 * Three-state machine:
 *
 * 1. `header` — Buffers everything before `<Data>` (a few hundred bytes).
 *    Once `<Data>` is found, saves the header to the skeleton with a
 *    placeholder, emits `'ready'`, and transitions to `data`.
 *
 * 2. `data` — Receives raw base64 text in HTTP-sized chunks (~16-64 KB).
 *    Decodes each chunk to binary and pushes it downstream. Nothing is added
 *    to the skeleton (the base64 blob is skipped). Keeps a small tail buffer
 *    (6 bytes) to safely detect `</Data>` split across chunks, and a base64
 *    remainder (0-3 chars) for 4-char alignment.
 *
 * 3. `tail` — Collects the XML closing tags after `</Data>` into the skeleton.
 *
 * Memory usage is O(1) regardless of file size — only the small skeleton and
 * fixed-size tail/remainder buffers are kept in memory.
 */
export class NacistSouborXmlParser extends Transform {
  /** Accumulates XML bytes before <Data> — only a few hundred bytes. */
  private headerBuf = ''
  /**
   * Holds the last 6 chars of each data chunk. This is needed because
   * `</Data>` (7 chars) could be split across two HTTP chunks — without
   * this buffer we might accidentally decode part of the closing tag as base64.
   */
  private dataTailBuf = ''
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
  private state: 'header' | 'data' | 'tail' = 'header'

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
    try {
      const str = chunk.toString('utf-8')

      if (this.state === 'header') {
        this.handleHeader(str)
      } else if (this.state === 'data') {
        this.handleData(str)
      } else {
        this.handleTail(str)
      }

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
   */
  override _flush(callback: TransformCallback) {
    if (this.state === 'data') {
      callback(new GinisError('Response stream ended before </Data> was found'))
      return
    }

    if (this.state === 'header') {
      this.skeleton = this.headerBuf
    }

    extractResponseJson(this.skeleton, 'Nacist-soubor', nacistSouborResponseSchema)
      .then(() => {
        callback()
      })
      .catch((err: unknown) => {
        callback(err as GinisError)
      })
  }

  /**
   * Accumulates the XML header. Once `<Data>` is found, saves everything
   * before it to the skeleton (with a placeholder instead of actual base64),
   * emits `'ready'` so the outer function knows data is flowing, and
   * transitions to the `data` state.
   */
  private handleHeader(str: string) {
    this.headerBuf += str

    const dataOpenIndex = this.headerBuf.indexOf(DATA_OPEN)
    if (dataOpenIndex === -1) return

    const afterData = this.headerBuf.substring(dataOpenIndex + DATA_OPEN.length)

    this.skeleton = this.headerBuf.substring(0, dataOpenIndex) + DATA_PLACEHOLDER
    this.headerBuf = ''

    this.state = 'data'
    this.emit('ready')

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
    const combined = this.dataTailBuf + str

    const dataCloseIndex = combined.indexOf(DATA_CLOSE)
    // We found the full `</Data>` tag in the current combined buffer.
    // Decode everything before it as file content, then switch to collecting
    // the trailing XML that comes after `</Data>`.
    if (dataCloseIndex !== -1) {
      this.decodeBase64(combined.substring(0, dataCloseIndex))
      this.flushBase64()
      this.dataTailBuf = ''

      this.skeleton += combined.substring(dataCloseIndex + DATA_CLOSE.length)
      this.state = 'tail'
      return
    }

    const tailSize = DATA_CLOSE.length - 1
    // We have not found `</Data>` yet, so keep the last 6 chars unread.
    // This makes split tags safe, e.g. chunk A ends with `</Da` and chunk B
    // starts with `ta>`. Everything before that tail can be decoded now.
    if (combined.length > tailSize) {
      this.decodeBase64(combined.substring(0, combined.length - tailSize))
      this.dataTailBuf = combined.substring(combined.length - tailSize)
    } else {
      this.dataTailBuf = combined
    }
  }

  /**
   * Collects the closing XML tags after `</Data>` into the skeleton.
   * These are only a few bytes, and are needed for zod validation in `_flush`.
   */
  private handleTail(str: string) {
    this.skeleton += str
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
 * @param bodyObj - Request parameters, typically `{ 'Id-souboru': fileId }`.
 * @returns A `Readable` stream of decoded binary data.
 * @throws {GinisError} On network errors, SOAP faults, or malformed responses.
 */
export async function nacistSouborStream(
  this: Ginis,
  bodyObj: UdeNacistSouborStreamRequest
): Promise<Readable> {
  const url = this.config.urls.ude
  if (!url) throw new GinisError('GINIS SDK Error: Missing UDE url in GINIS config')

  const requestName = 'Nacist-soubor'
  const requestNamespace = 'http://www.gordic.cz/svc/xrg-ude/v_1.0.0.0'

  const response = await makeAxiosRequest<Readable>(
    { ...createXmlRequestConfig(requestName, requestNamespace), responseType: 'stream' },
    url,
    createXmlRequestBody(this.config, {
      name: requestName,
      namespace: requestNamespace,
      xrgNamespace: 'http://www.gordic.cz/xrg/ude/nacist-soubor/request/v_1.0.0.0',
      paramsBodies: [bodyObj],
      paramOrders: nacistSouborParamOrders,
    }),
    this.config.debug
  )

  const parser = new NacistSouborXmlParser()
  pipeline(response.data, parser, (error) => {
    if (error && !parser.destroyed) {
      parser.destroy(error instanceof Error ? error : new Error(String(error)))
    }
  })

  return parser as Readable
}
