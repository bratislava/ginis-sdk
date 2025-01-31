import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { GinisError } from './errors'

const defaultAxiosConfig: AxiosRequestConfig = {
  headers: {
    'Content-Type': 'text/xml; charset=utf-8',
  },
}

export const makeAxiosRequest = async <T>(
  axiosConfig: AxiosRequestConfig | undefined,
  url: string | undefined,
  body: string | object,
  debug?: boolean
) => {
  if (!url) {
    throw new GinisError('Missing GINIS url for the service you are trying to reach.')
  }

  const requestConfig = axiosConfig || defaultAxiosConfig

  if (debug) {
    console.log('########### GINIS REQUEST ###########')
    console.log('headers: ', requestConfig.headers)
    console.log('body: ', body)
    console.log('########### GINIS REQUEST END ###########')
  }
  let responseAxios
  try {
    responseAxios = await axios.post<T>(url, body, requestConfig)
  } catch (error) {
    let anyError = error as any
    if (debug) {
      console.log('########### GINIS ERROR RESPONSE ###########')
      console.log('status: ', anyError?.response?.status)
      console.log('statusText: ', anyError?.response?.statusText)
      console.log('data: ', anyError?.response?.data)
      console.log('########### GINIS RESPONSE END ###########')
    }
    throw makeResponseDetailError(anyError?.response?.data, error)
  }
  if (debug) {
    console.log('########### GINIS RESPONSE ###########')
    console.log('status: ', responseAxios.status)
    console.log('statusText: ', responseAxios.statusText)
    console.log('data: ', responseAxios.data)
    console.log('########### GINIS RESPONSE END ###########')
  }
  return {
    data: responseAxios.data,
    status: responseAxios.status,
    statusText: responseAxios.statusText,
  }
}

function makeResponseDetailError(responseData: unknown, error: unknown) {
  if (!(error instanceof Error)) {
    return new GinisError(
      'Non-error passed to throwErrorFaultDetail in ginis-sdk. This should never happen.'
    )
  }

  const errorDetail =
    responseData != null && typeof responseData === 'string'
      ? `${error.message}\r\nError response details: ${responseData}`
      : error.message
  if (error instanceof AxiosError) {
    return new GinisError(errorDetail, error)
  }
  return new GinisError(errorDetail)
}
