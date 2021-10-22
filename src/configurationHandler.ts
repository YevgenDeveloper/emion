import { ConfigurationSchema, ExecutionEnvironement, RepositoryConfiguration } from './configuration.interface'
import fs from 'fs'
const fsPromises = fs.promises
let configHandler: ConfigurationHandler
import path from 'path'
const homeFolder = process.env.HOME
const defaultConfigFilePath = path.join(
  __dirname,
  '../json/config.default.json'
)
const schemaFilePath = path.join(__dirname, '../json/config.schema.json')
const configFilePath = path.join(homeFolder!, '.launcherConfig.json')
export default class ConfigurationHandler {
  public configuration: ConfigurationSchema
  public async loadConfigFile() {
    this.configuration = JSON.parse(await fsPromises.readFile(configFilePath, 'utf8'))
  }
  public isConfigFileInitialized() {
    return fs.existsSync(configFilePath)
  }
  public getEnvironmentsNames(): string[] {
    const repositories = Object.keys(this.configuration.repositories)
    let envs: string[] = []
    for (const repo of repositories) {
      envs = envs.concat(
        Object.keys(this.configuration.repositories[repo].environments)
      )
    }
    return envs
  }
  public getEnvironment(envName: string): ExecutionEnvironement {
    const envs = this.getEnvironments()
    const env = envs[envName]
    if (!env) {
      throw new Error(`Unknown environement ${envName}`)
    }
    return env
  }
  public getRepository(repoName: string): RepositoryConfiguration {
    return this.configuration.repositories[repoName]
  }
  public getRepositoryNames(): string[] {
    return Object.keys(this.configuration.repositories)
  }
  public getRepoPath(): string {
    return this.configuration.repoPath
  }
  public getEnvironments(): { [key: string]: ExecutionEnvironement } {
    const repositories = Object.keys(this.configuration.repositories)
    let finalEnvs: { [key: string]: ExecutionEnvironement } = {}
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
  public async save() {
    await fsPromises.writeFile(
      configFilePath,
      JSON.stringify(this.configuration, undefined, '\t'),
      { encoding: 'utf8' }
    )
  }
  public async loadDefaultConfigFile() {
    this.configuration = JSON.parse(await fsPromises.readFile(defaultConfigFilePath, 'utf8'))
  }
  public getConfigFilePath() : string {
    return configFilePath
  }
}
export function getConfigHandler() {
  if(!configHandler) {
    configHandler = new ConfigurationHandler()
  }
  return configHandler
}
