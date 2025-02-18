import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

import { GinisError } from './errors'

const defaultAxiosConfig: AxiosRequestConfig = {
  headers: {
    'Content-Type': 'text/xml; charset=utf-8',
  },
}

export async function makeAxiosRequest<T>(
  axiosConfig: AxiosRequestConfig | undefined,
  url: string | undefined,
  body: string,
  debug?: boolean
) {
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
  let responseAxios: AxiosResponse<T>
  try {
    responseAxios = await axios.post<T>(url, body, requestConfig)
  } catch (error) {
    if (!(error instanceof AxiosError)) {
      throw makeResponseDetailError(error)
    }
    if (debug) {
      console.log('########### GINIS ERROR RESPONSE ###########')
      console.log('status: ', error.response?.status)
      console.log('statusText: ', error.response?.statusText)
      console.log('data: ', error.response?.data)
      console.log('########### GINIS RESPONSE END ###########')
    }
    throw makeResponseDetailError(error, error.response?.data)
  }
  if (debug) {
    console.log('########### GINIS RESPONSE ###########')
    console.log('status: ', responseAxios.status)
    console.log('statusText: ', responseAxios.statusText)
    console.log('data: ', responseAxios.data)
    console.log('########### GINIS RESPONSE END ###########')
  }
  return responseAxios
}

function makeResponseDetailError(error: unknown, responseData: unknown = null) {
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
