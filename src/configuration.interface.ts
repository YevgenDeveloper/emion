export interface IConfigurationSchema {
  $schema?: string
  repoPath: string
  repositories: { [key: string]: IRepositoryConfiguration }
}
export interface IRepositoryConfiguration {
  branch?: string
  environments: { [key: string]: IExecutionEnvironment }
  initCommand?: string
  url?: string
}
export interface IExecutionEnvironment {
  currentPid?: number
  arguments?: string[]
  command?: string
  dependsOn?: string[]
  id?: string
  readyWhen?: IReadyWhen
  repo?: string,
  ready?: boolean
}
export interface IReadyWhen {
  portIsUp?: number
  consoleMessageIsFound?: string
}
export enum EConfigRepositoryItemType {
  all = 'all',
  url = 'url',
  command = 'command',
  branch = 'branch',
  environments = 'environments'
}
export enum EConfigEnvironmentItemType {
  command = 'command',
  parameters = 'parameters',
  dependsOn = 'dependsOn',
  isReadyWhen = 'isReadyWhen',
}
