import { Ginis } from '../../../index'
import { envGetOrThrow } from '../../../utils/test-utils'

// POD endpoints are disabled, as POD is not licensed after test period expired
describe.skip('POD-Detail-el-podani', () => {
  let ginis: Ginis
  beforeAll(() => {
    ginis = new Ginis({
      urls: {
        pod: envGetOrThrow('GINIS_POD_HOST'),
      },
      username: envGetOrThrow('GINIS_USERNAME'),
      password: envGetOrThrow('GINIS_PASSWORD'),
      debug: false,
    })
  })

  test('Basic request', async () => {
    const data = await ginis.pod.detailElPodani({
      'Id-zpravy': 'fb0d1873-19f5-43a2-a4c4-5924951a019b',
    })

    expect(data['Detail-el-podani']['Id-dokumentu']).toBe('MAG0X04WW5AM')
  }, 20_000)
})
