import { AxiosError } from 'axios'

// serves as a way to easily distinguish in client code by instance type
export class GinisError extends Error {
  axiosError?: AxiosError

  constructor(message: string, axiosError?: AxiosError) {
    super(message)
    if (axiosError != null) {
      this.axiosError = axiosError
    }
  }
}
