import axios, { AxiosRequestConfig } from 'axios'

export const makeAxiosRequest = async (
  axiosConfig: AxiosRequestConfig,
  url: string | undefined,
  body: string,
  debug?: boolean
) => {
  if (!url) {
    throw new Error('Missing GINIS url for the service you are trying to reach.')
  }
  if (debug) {
    console.log('########### GINIS REQUEST ###########')
    console.log('headers: ', axiosConfig.headers)
    console.log('body: ', body)
    console.log('########### GINIS REQUEST END ###########')
  }
  let responseAxios
  try {
    responseAxios = await axios.post(url, body, axiosConfig)
  } catch (error) {
    if (debug) {
      console.error(error)
    }
    throw error
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
