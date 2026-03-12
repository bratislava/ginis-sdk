export type GinisEnvVariable =
  | 'GINIS_GIN_HOST'
  | 'GINIS_SSL_HOST'
  | 'GINIS_SSL_MTOM_HOST'
  | 'GINIS_UDE_HOST'
  | 'GINIS_POD_HOST'
  | 'GINIS_USERNAME'
  | 'GINIS_PASSWORD'

export function envGetOrThrow(envVariableName: GinisEnvVariable): string {
  // The key is constrained by GinisEnvVariable; indexed env access is intentional here.
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[envVariableName]

  if (!value) {
    throw new Error(`Missing required env var: ${envVariableName}`)
  }

  return value
}
