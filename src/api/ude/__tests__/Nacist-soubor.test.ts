import { Ginis, UdeNacistSouborResponse, UdeNacistSouborStream } from '../../../index'
import { envGetOrThrow } from '../../../utils/test-utils'

describe('UDE-Nacist-soubor', () => {
  let ginis: Ginis

  const noDiskError = 'Chyba: El. dokument nelze stáhnout, protože se nachází na zrušeném disku.'
  const noDiskErrorCode = 'kód: 24200135'
  const noDiskSkipMessage = 'Skipping test as no disk is available within this environment.'
  const expectedFilename = 'Plnenie UZN c. 135_2015 február 2021.pdf'

  beforeAll(() => {
    ginis = new Ginis({
      urls: {
        ude: envGetOrThrow('GINIS_UDE_HOST'),
      },
      username: envGetOrThrow('GINIS_USERNAME'),
      password: envGetOrThrow('GINIS_PASSWORD'),
      debug: false,
    })
  })

  test('Basic request', async () => {
    let data: UdeNacistSouborResponse
    try {
      data = await ginis.ude.nacistSoubor({
        'Id-souboru': 'MAG00B0PVN5H#0#MAG00B0PVN5H',
      })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      if (error.message.includes(noDiskError) || error.message.includes(noDiskErrorCode)) {
        // this means the request format is correct and file ID is valid
        console.warn(noDiskSkipMessage)
        return
      }

      throw error
    }

    expect(data['Nacist-soubor']?.['Jmeno-souboru']).toBe(expectedFilename)
  }, 20_000)

  test('Stream request', async () => {
    let streamResult: UdeNacistSouborStream
    try {
      streamResult = await ginis.ude.nacistSouborStream({
        'Id-souboru': 'MAG00B0PVN5H#0#MAG00B0PVN5H',
      })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      if (error.message.includes(noDiskError) || error.message.includes(noDiskErrorCode)) {
        // this means the request format is correct and file ID is valid
        console.warn(noDiskSkipMessage)
        return
      }

      throw error
    }

    const dataBuffer = await new Promise<Buffer>((resolve, reject) => {
      const parts: Buffer[] = []
      streamResult.on('data', (chunk: Buffer) => parts.push(chunk))
      streamResult.on('end', () => {
        resolve(Buffer.concat(parts))
      })
      streamResult.on('error', reject)
    })

    const parsedResponse = await streamResult.response

    expect(dataBuffer.length).toBeGreaterThan(0)
    expect(parsedResponse['Nacist-soubor']?.['Jmeno-souboru']).toBe(expectedFilename)
  }, 20_000)
})
