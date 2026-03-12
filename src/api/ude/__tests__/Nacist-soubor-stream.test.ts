import { Readable } from 'stream'

import { Ginis } from '../../../index'
import { GinisError } from '../../../utils/errors'
import { NacistSouborXmlParser } from '../Nacist-soubor-stream'

describe('UDE-Nacist-soubor-stream', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        ude:
          process.env['GINIS_UDE_HOST'] ??
          'http://is-ginis-apl-p.bratislava.sk/gordic/ginis/ws/Ude01/Ude.svc',
      },
      username: process.env['GINIS_USERNAME'] ?? '',
      password: process.env['GINIS_PASSWORD'] ?? '',
      debug: false,
    })
  })

  test('Basic request', async () => {
    let stream: Readable
    try {
      stream = await ginis.ude.nacistSouborStream({
        'Id-souboru': 'MAG00B0PVN5H#0#MAG00B0PVN5H',
      })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      const noDiskError =
        'Chyba: El. dokument nelze stáhnout, protože se nachází na zrušeném disku.'
      const noDiskErrorCode = 'kód: 24200135'
      if (error.message.includes(noDiskError) || error.message.includes(noDiskErrorCode)) {
        // this means the request format is correct and file ID is valid
        console.warn('Skipping test as no disk is available within this environment.')
        return
      }

      throw error
    }

    const dataBuffer = await new Promise<Buffer>((resolve, reject) => {
      const parts: Buffer[] = []
      stream.on('data', (chunk: Buffer) => parts.push(chunk))
      stream.on('end', () => {
        resolve(Buffer.concat(parts))
      })
      stream.on('error', reject)
    })

    expect(dataBuffer.length).toBeGreaterThan(0)
  }, 20_000)
})

/** Collect all data chunks from a Transform into a single Buffer. */
async function collect(parser: NacistSouborXmlParser): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const parts: Buffer[] = []
    parser.on('data', (chunk: Buffer) => parts.push(chunk))
    parser.on('end', () => {
      resolve(Buffer.concat(parts))
    })
    parser.on('error', reject)
  })
}

/**
 * Push an array of string chunks into a parser as UTF-8 Buffers, then end it.
 * Returns the collect() promise so the caller can await or rejects.
 */
async function feed(parser: NacistSouborXmlParser, chunks: string[]): Promise<Buffer> {
  const result = collect(parser)
  for (const c of chunks) parser.write(Buffer.from(c, 'utf-8'))
  parser.end()
  return await result
}

/**
 * Build a minimal valid GINIS Nacist-soubor SOAP envelope string.
 * `dataB64` is placed verbatim between <Data> and </Data>.
 */
function envelope(dataB64: string, filename = 'file.bin'): string {
  return (
    `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<s:Body>` +
    `<Nacist-souborResponse xmlns="http://www.gordic.cz/svc/xrg-ude/v_1.0.0.0">` +
    `<Nacist-souborResult>` +
    `<Xrg>` +
    `<Nacist-soubor>` +
    `<Jmeno-souboru>${filename}</Jmeno-souboru>` +
    `<Data>${dataB64}</Data>` +
    `</Nacist-soubor>` +
    `</Xrg>` +
    `</Nacist-souborResult>` +
    `</Nacist-souborResponse>` +
    `</s:Body>` +
    `</s:Envelope>`
  )
}

describe('UDE-Nacist-soubor-stream — NacistSouborXmlParser', () => {
  describe('Happy path', () => {
    test('decodes a small file in one chunk', async () => {
      const original = Buffer.from('Hello GINIS!')
      const result = await feed(new NacistSouborXmlParser(), [
        envelope(original.toString('base64')),
      ])
      expect(result).toEqual(original)
    })

    test('decodes a file split across many 20-char chunks', async () => {
      const original = Buffer.from('chunk-based binary content here')
      const xml = envelope(original.toString('base64'))
      const chunks: string[] = []
      for (let i = 0; i < xml.length; i += 20) chunks.push(xml.slice(i, i + 20))

      const result = await feed(new NacistSouborXmlParser(), chunks)
      expect(result).toEqual(original)
    })

    test('decodes a 1 KB binary blob', async () => {
      const original = Buffer.from(Array.from({ length: 1024 }, (_, i) => i % 256))
      const result = await feed(new NacistSouborXmlParser(), [
        envelope(original.toString('base64')),
      ])
      expect(result).toEqual(original)
    })

    test('handles an empty <Data> tag (zero-byte file)', async () => {
      const result = await feed(new NacistSouborXmlParser(), [envelope('')])
      expect(result.length).toBe(0)
    })

    test('emits the "ready" event once <Data> is found', async () => {
      const original = Buffer.from('ready-event-test')
      const parser = new NacistSouborXmlParser()
      let readyFired = false
      parser.on('ready', () => {
        readyFired = true
      })
      await feed(parser, [envelope(original.toString('base64'))])
      expect(readyFired).toBe(true)
    })

    test('"ready" fires before the first data chunk is pushed', async () => {
      const original = Buffer.from('ordering-test')
      const parser = new NacistSouborXmlParser()
      const events: string[] = []
      parser.on('ready', () => events.push('ready'))
      parser.on('data', () => {
        if (!events.includes('data')) events.push('data')
      })
      await feed(parser, [envelope(original.toString('base64'))])
      expect(events.indexOf('ready')).toBeLessThan(events.indexOf('data'))
    })
  })

  describe('Base64 remainder (non-4-char boundaries)', () => {
    test('correctly stitches a base64 payload split at every 3 chars', async () => {
      const original = Buffer.from('test-remainder')
      const b64 = original.toString('base64')
      const xml = envelope(b64)

      const dataOpenTag = '<Data>'
      const dataCloseTag = '</Data>'
      const dataStart = xml.indexOf(dataOpenTag) + dataOpenTag.length
      const dataEnd = xml.indexOf(dataCloseTag)

      const chunks = [
        xml.slice(0, dataStart), // header up to and including <Data>
        ...(() => {
          const parts: string[] = []
          const data = xml.slice(dataStart, dataEnd)
          for (let i = 0; i < data.length; i += 3) parts.push(data.slice(i, i + 3))
          return parts
        })(),
        xml.slice(dataEnd), // </Data> + tail
      ]

      const result = await feed(new NacistSouborXmlParser(), chunks)
      expect(result).toEqual(original)
    })

    test('handles base64 remainder of 1 leftover char', async () => {
      // 1 byte → "AQ==" — remainder of 1 char before padding
      const original = Buffer.from([0x01])
      const result = await feed(new NacistSouborXmlParser(), [
        envelope(original.toString('base64')),
      ])
      expect(result).toEqual(original)
    })

    test('handles base64 remainder of 2 leftover chars', async () => {
      // 2 bytes → "AAE=" — remainder of 2 chars before padding
      const original = Buffer.from([0x00, 0x01])
      const result = await feed(new NacistSouborXmlParser(), [
        envelope(original.toString('base64')),
      ])
      expect(result).toEqual(original)
    })
  })

  describe('Boundary detection across chunks', () => {
    test('detects </Data> split in the middle across two chunks', async () => {
      const original = Buffer.from('split-close-tag')
      const xml = envelope(original.toString('base64'))
      const closeIdx = xml.indexOf('</Data>')
      const splitAt = closeIdx + 3 // "</Da" | "ta>..."

      const result = await feed(new NacistSouborXmlParser(), [
        xml.slice(0, splitAt),
        xml.slice(splitAt),
      ])
      expect(result).toEqual(original)
    })

    test('detects <Data> split in the middle across two chunks', async () => {
      const original = Buffer.from('split-open-tag')
      const xml = envelope(original.toString('base64'))
      const openIdx = xml.indexOf('<Data>')
      const splitAt = openIdx + 3 // "<Da" | "ta>..."

      const result = await feed(new NacistSouborXmlParser(), [
        xml.slice(0, splitAt),
        xml.slice(splitAt),
      ])
      expect(result).toEqual(original)
    })

    test('works when every character arrives in its own chunk', async () => {
      const original = Buffer.from('one-char-chunks')
      const xml = envelope(original.toString('base64'))
      const result = await feed(new NacistSouborXmlParser(), xml.split(''))
      expect(result).toEqual(original)
    })

    test('works when the entire payload arrives in a single character Buffer per write', async () => {
      const original = Buffer.from('single-byte-writes')
      const xml = envelope(original.toString('base64'))
      const parser = new NacistSouborXmlParser()
      const result = collect(parser)
      for (const byte of Buffer.from(xml, 'utf-8')) {
        parser.write(Buffer.from([byte]))
      }
      parser.end()
      expect(await result).toEqual(original)
    })
  })

  describe('Error handling', () => {
    test('errors if stream ends while still in "data" state (no </Data>)', async () => {
      const truncated =
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
        '<s:Body><Nacist-souborResponse><Nacist-souborResult><Xrg><Nacist-soubor>' +
        '<Jmeno-souboru>f.bin</Jmeno-souboru>' +
        '<Data>AAAA' // no closing tag

      await expect(feed(new NacistSouborXmlParser(), [truncated])).rejects.toThrow(
        'Response stream ended before </Data> was found'
      )
    })

    test('errors on completely invalid XML (no <Data>, extractResponseJson fails)', async () => {
      await expect(feed(new NacistSouborXmlParser(), ['this is not XML at all'])).rejects.toThrow(
        GinisError
      )
    })

    test('errors when the SOAP body contains a Fault instead of the expected response', async () => {
      const fault =
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
        '<s:Body>' +
        '<s:Fault><faultcode>s:Client</faultcode>' +
        '<faultstring>Access denied</faultstring></s:Fault>' +
        '</s:Body>' +
        '</s:Envelope>'

      await expect(feed(new NacistSouborXmlParser(), [fault])).rejects.toThrow(GinisError)
    })

    test('errors when <Xrg> is absent (xrgContent is undefined, zod rejects)', async () => {
      // xml2js returns undefined for a missing element — extractResponseJson only coerces
      // the empty *string* '' to {}, not undefined. So a missing <Xrg> throws a GinisError.
      const missingXrg =
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
        '<s:Body>' +
        '<Nacist-souborResponse xmlns="http://www.gordic.cz/svc/xrg-ude/v_1.0.0.0">' +
        '<Nacist-souborResult>' +
        // <Xrg> omitted → xrgContent === undefined → zod throws
        '</Nacist-souborResult>' +
        '</Nacist-souborResponse>' +
        '</s:Body>' +
        '</s:Envelope>'

      await expect(feed(new NacistSouborXmlParser(), [missingXrg])).rejects.toThrow(GinisError)
    })
  })
})
