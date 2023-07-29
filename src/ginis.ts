import ssl from './api/json/ssl'
import pod from './api/json/pod'
import { bind, mapValues } from 'lodash'

export type GinisConfig = {
  username: string
  password: string
  urls: {
    ude?: string
    ssl?: string
    pod?: string
  }
  debug?: boolean
}

// presently empty, prepared in case we're to add default values in the future
export const defaultConfig = {}

type _Ssl = typeof ssl
/**
 * full SSL service docs: https://robot.gordic.cz/xrg/Default.html?c=OpenModuleDetail&moduleName=SSL&language=cs-CZ&version=390
 */
export type Ssl = {
  [P in keyof _Ssl]: OmitThisParameter<_Ssl[P]>
}

type _Pod = typeof pod
/**
 * full POD service docs: https://robot.gordic.cz/xrg/Default.html?c=OpenModuleDetail&moduleName=POD&language=cs-CZ&version=390
 */
export type Pod = {
  [P in keyof _Pod]: OmitThisParameter<_Pod[P]>
}

// exports all services with server config bound to the one passed at construction
export class Ginis {
  config: GinisConfig
  /**
   * Exports functions of the api's with config and url values bound.
   * See documentation of the api for request options.
   * Inputs are typed objects, outputs unformatted xml.
   */
  json: {
    ssl: Ssl
    pod: Pod
  }

  constructor(config: GinisConfig) {
    this.config = {
      ...defaultConfig,
      ...config,
    }
    this.json = {
      ssl: mapValues(ssl, (v) => bind(v, this)),
      pod: mapValues(pod, (v) => bind(v, this)),
    }
  }
}
