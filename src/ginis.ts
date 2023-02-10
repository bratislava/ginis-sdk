import ude from './api/ude'
import ssl from './api/ssl'
import type { OmitFirstTwoArgs } from './utils/types'
import { bind, mapValues } from 'lodash'

export type GinisConfig = {
  username: string
  password: string
  urls: {
    ude?: string
    ssl?: string
  }
  debug?: boolean
}

// presently empty, prepared in case we're to add default values in the future
export const defaultConfig = {}

type _Ude = typeof ude
/**
 * full UDE service docs: https://robot.gordic.cz/xrg/Default.html?c=OpenModuleDetail&moduleName=UDE&language=cs-CZ&version=390
 */
export type Ude = {
  [P in keyof _Ude]: OmitFirstTwoArgs<_Ude[P]>
}

type _Ssl = typeof ssl
/**
 * full SSL service docs: https://robot.gordic.cz/xrg/Default.html?c=OpenModuleDetail&moduleName=SSL&language=cs-CZ&version=390
 */
export type Ssl = {
  [P in keyof _Ssl]: OmitFirstTwoArgs<_Ssl[P]>
}

// exports all services with server config bound to the one passed at construction
export class Ginis {
  config: GinisConfig
  /**
   * Exports functions of the api's with config and url values bound.
   * See documentation of the api for request options.
   * Inputs are typed objects, outputs unformatted xml.
   */
  xml: {
    ude: Ude
    ssl: Ssl
  }

  constructor(config: GinisConfig) {
    this.config = {
      ...defaultConfig,
      ...config,
    }
    this.xml = {
      ude: mapValues(
        ude,
        (v) => bind(v, this, this.config, this.config.urls.ude) as OmitFirstTwoArgs<typeof v>
      ),
      ssl: mapValues(
        ssl,
        (v) => bind(v, this, this.config, this.config.urls.ssl) as OmitFirstTwoArgs<typeof v>
      ),
    }
  }
}
