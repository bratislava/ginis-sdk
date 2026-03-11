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
 * Streaming XML parser for GINIS Nacist-soubor responses.
 *
 * Buffers only the small XML header (everything before <Data>), extracts the
 * filename from <Jmeno-souboru>, then streams base64-decoded <Data> content
 * as binary output — keeping memory usage constant regardless of file size.
 */
class NacistSouborXmlParser extends Transform {
  private headerBuf = ''
  private tailBuf = ''
  private base64Rem = ''
  private state: 'header' | 'data' | 'done' = 'header'
  public filename: string | null = null

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

      callback()
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)))
    }
  }

  override _flush(callback: TransformCallback) {
    if (this.state === 'header') {
      const faultMatch = SOAP_FAULT_RE.exec(this.headerBuf)
      if (faultMatch) {
        this.reject(new GinisError(`SOAP Fault: ${faultMatch[1]}`))
      } else if (!this.filename) {
        this.resolve(null)
      } else {
        this.reject(new GinisError('Found <Jmeno-souboru> but no <Data> in response'))
      }
    } else if (this.state === 'data') {
      this.decodeBase64(this.tailBuf)
      this.flushBase64()
      this.tailBuf = ''
    }
    callback()
  }

  private handleHeader(str: string) {
    this.headerBuf += str

    if (!this.filename) {
      const match = FILENAME_RE.exec(this.headerBuf)
      if (match?.[1]) this.filename = match[1]
    }

    const idx = this.headerBuf.indexOf(DATA_OPEN)
    if (idx === -1) return

    const afterData = this.headerBuf.substring(idx + DATA_OPEN.length)
    this.headerBuf = ''

    if (!this.filename) {
      this.reject(new GinisError('Found <Data> before <Jmeno-souboru> in XML response'))
      this.state = 'done'
      return
    }

    this.state = 'data'
    this.resolve({ filename: this.filename, dataStream: this })

    if (afterData.length > 0) {
      this.handleData(afterData)
    }
  }

  private handleData(str: string) {
    const combined = this.tailBuf + str

    const closeIdx = combined.indexOf(DATA_CLOSE)
    if (closeIdx !== -1) {
      this.decodeBase64(combined.substring(0, closeIdx))
      this.flushBase64()
      this.tailBuf = ''
      this.state = 'done'
      return
    }

    // Keep a tail buffer so </Data> split across chunks is not missed
    const tailSize = DATA_CLOSE.length - 1
    if (combined.length > tailSize) {
      this.decodeBase64(combined.substring(0, combined.length - tailSize))
      this.tailBuf = combined.substring(combined.length - tailSize)
    } else {
      this.tailBuf = combined
    }
  }

  private decodeBase64(str: string) {
    if (str.length === 0) return

    const full = this.base64Rem + str
    const aligned = full.length - (full.length % 4)
    if (aligned > 0) {
      this.push(Buffer.from(full.substring(0, aligned), 'base64'))
    }
    this.base64Rem = full.substring(aligned)
  }

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
 * Streaming variant of nacistSoubor. Instead of loading the entire XML into
 * memory, it streams the response and base64-decodes <Data> on the fly.
 *
 * Returns `{ filename, dataStream }` where `dataStream` is a Readable of the
 * decoded binary file. Returns `null` when the file is not found (empty Xrg).
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

  return new Promise<NacistSouborStreamResult | null>((resolve, reject) => {
    const parser = new NacistSouborXmlParser(resolve, reject)

    responseStream.on('error', (err) => {
      parser.destroy(err)
      reject(new GinisError(`GINIS response stream error: ${err.message}`))
    })

    parser.on('error', (err) => {
      responseStream.destroy()
      reject(err instanceof GinisError ? err : new GinisError(err.message))
    })

    // Clean up the HTTP stream when the parser is done or destroyed
    parser.on('close', () => {
      if (!responseStream.destroyed) responseStream.destroy()
    })

    responseStream.pipe(parser)
  })
}
