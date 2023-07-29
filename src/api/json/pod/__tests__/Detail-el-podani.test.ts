import { Ginis } from '../../../../index'

jest.setTimeout(20000)

describe('Detail-el-podani', () => {
  let ginis: Ginis
  beforeAll(() => {
    console.log(
      'Loading GINIS credentials from .env - make sure you have correct local configuration.'
    )
    ginis = new Ginis({
      urls: {
        pod: 'http://172.25.1.195/gordic/ginis/ws/POD01/Pod.svc',
      },
      username: process.env['GINIS_USERNAME']!,
      password: process.env['GINIS_PASSWORD']!,
      debug: false,
    })
  })

  test('Basic request', async () => {
    const data = await ginis.json.pod.detailElPodani({
      'Id-el-podani': '28a3e8de-95a7-4834-962e-f27b6c',
    })
    expect(data['Detail-el-podani']['Datum-prijeti']).toBeTruthy()
  })
})
