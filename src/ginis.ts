import ssl from './api/ssl'
import pod from './api/pod'
import gin from './api/gin'
import ude from './api/ude'
import { bind, mapValues } from 'lodash'

export type GinisConfig = {
  username: string
  password: string
  urls: {
    ude?: string
    ssl?: string
    pod?: string
    gin?: string
  }
  debug?: boolean
}

// presently empty, prepared in case we're to add default values in the future
export const defaultConfig = {}

type _Ude = typeof ude
/**
 * full UDE service docs: https://robot.gordic.cz/xrg/Default.html?c=OpenModuleDetail&moduleName=UDE&language=cs-CZ&version=524
 */
export type Ude = {
  [P in keyof _Ude]: OmitThisParameter<_Ude[P]>
}

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

type _Gin = typeof gin
/**
 * full GIN service docs: https://robot.gordic.cz/xrg/Default.html?c=OpenModuleDetail&moduleName=GIN&language=cs-CZ&version=390
 */
export type Gin = {
  [P in keyof _Gin]: OmitThisParameter<_Gin[P]>
}

// exports all services with server config bound to the one passed at construction
export class Ginis {
  config: GinisConfig
  /**
   * Exports functions of the api's with config and url values bound.
   * See documentation of the api for request options.
   */
  xml: {
    ssl: Ssl
    pod: Pod
    gin: Gin
    ude: Ude
  }

  constructor(config: GinisConfig) {
    this.config = {
      ...defaultConfig,
      ...config,
    }

    this.xml = {
      ssl: mapValues(ssl, (v) => bind(v, this)),
      pod: mapValues(pod, (v) => bind(v, this)),
      gin: mapValues(gin, (v) => bind(v, this)),
      ude: mapValues(ude, (v) => bind(v, this)),
    }
  }
}
