import fs from 'fs'
import path from 'path'
import { IConfigurationSchema, IExecutionEnvironement, IRepositoryConfiguration } from './configuration.interface'
import logger from './logger'
import { logEnd, logStart, LogStartEnd } from './utils'
const fsPromises = fs.promises
let configHandler: ConfigurationHandler
const homeFolder = process.env.HOME
const defaultConfigFilePath = path.join(
  __dirname,
  '../json/config.default.json'
)
const schemaFilePath = path.join(__dirname, '../json/config.schema.json')
const configFilePath = path.join(homeFolder!, '.launcherConfig.json')
export default class ConfigurationHandler {
  public configuration: IConfigurationSchema
  constructor(configuration?: IConfigurationSchema) {
    this.configuration = configuration || { repoPath: '', repositories: {} }
  }
  @LogStartEnd()
  public async loadConfigFile() {
    logger.info(`Loading config file from ${configFilePath}`)
    this.configuration = JSON.parse(await fsPromises.readFile(configFilePath, 'utf8'))
  }
  public isConfigFileInitialized() {
    return fs.existsSync(configFilePath)
  }
  @LogStartEnd()
  public getEnvironmentsNames(): string[] {
    logger.debug(`Using repositories ${JSON.stringify(this.configuration.repositories)}`)
    const repositories = Object.keys(this.configuration.repositories)
    let envs: string[] = []
    for (const repo of repositories) {
      envs = envs.concat(
        Object.keys(this.configuration.repositories[repo].environments)
      )
    }
    return envs
  }
  @LogStartEnd()
  public getEnvironments(): { [key: string]: IExecutionEnvironement } {
    logger.debug(`Using repositories ${JSON.stringify(this.configuration.repositories)}`)
    const repositories = Object.keys(this.configuration.repositories)
    const finalEnvs: { [key: string]: IExecutionEnvironement } = {}
    for (const repo of repositories) {
      const envs = Object.keys(
        this.configuration.repositories[repo].environments
      )
      for (const env of envs) {
        const envObj = this.configuration.repositories[repo].environments[env]
        envObj.repo = repo
        envObj.id = env
        finalEnvs[env] = envObj
      }
    }
    return finalEnvs
  }
  @LogStartEnd()
  public getEnvironment(envName: string): IExecutionEnvironement {
    logStart(arguments, 'getEnvironment')
    const envs = this.getEnvironments()
    const env = envs[envName]
    if (!env) {
      throw new Error(`Unknown environement ${envName}`)
    }
    return logEnd(env, 'getEnvironment')
  }
  @LogStartEnd()
  public getRepository(repoName: string): IRepositoryConfiguration {
    return this.configuration.repositories[repoName]
  }
  @LogStartEnd()
  public getRepositoryNames(): string[] {
    return Object.keys(this.configuration.repositories)
  }
  @LogStartEnd()
  public getRepoPath(): string {
    return this.configuration.repoPath
  }
  @LogStartEnd()
  public async save() {
    await fsPromises.writeFile(
      configFilePath,
      JSON.stringify(this.configuration, undefined, '\t'),
      { encoding: 'utf8' }
    )
  }
  @LogStartEnd()
  public async loadDefaultConfigFile() {
    this.configuration = JSON.parse(await fsPromises.readFile(defaultConfigFilePath, 'utf8'))
  }
  public getConfigFilePath(): string {
    return configFilePath
  }
}
export function getConfigHandler() {
  if (!configHandler) {
    configHandler = new ConfigurationHandler()
  }
  return configHandler
}
