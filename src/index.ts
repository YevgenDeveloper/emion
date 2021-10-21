import vorpal from 'vorpal'
import fs from 'fs'
import path from 'path'
import {
  ConfigSchema,
  EConfigRepositoryItemType as EConfigElemKind,
  ExecutionEnvironement
} from './config.interface'
import CFonts from 'cfonts'
import simplegit from 'simple-git/promise'
let currentRepo: simplegit.SimpleGit
import ChildProcess, { exec } from 'child_process'
import { pickRandomColor, kill, checkAndparseParametrizedString } from './utils'
import * as portscanner from 'portscanner'
const fsPromises = fs.promises
let configuration: ConfigSchema
const homeFolder = process.env.HOME
const configFilePath = path.join(homeFolder!, '.launcherConfig.json')
const defaultConfigFilePath = path.join(
  __dirname,
  '../json/config.default.json'
)
const schemaFilePath = path.join(__dirname, '../json/config.schema.json')
const v: Vorpal = vorpal()
const runningCommands: { [key: string]: ExecutionEnvironement } = {}
const ADD_CHOICE = '️️️🔆 Add'
const REMOVE_CHOICE = '❌ Remove'
const DEEP_INTERACTIVE_CONFIGURATION = false
handleExit()
init().then(run, abort)
async function init() {
  v.command('config', 'Configure the different repository to use and their environments').action(
    async function(this: Vorpal.CommandInstance, args: any, callback: any) {
      const configureWorkingPath = async function(
        this: Vorpal.CommandInstance
      ) {
        let response: any
        response = await this.prompt({
          type: 'input',
          name: 'repoPath',
          default: configuration.repoPath,
          message: `In which folder should repositories be cloned? `
        })
        configuration.repoPath = response.repoPath.trim()
      }.bind(this)
      const configureRepositoryElem = async function(
        this: Vorpal.CommandInstance,
        inputs: {
          configElemKind: string
          repository: string
        }
      ) {
        const { configElemKind, repository } = inputs
        if (!configuration.repositories) {
          configuration.repositories = {}
        }
        if (!configuration.repositories[repository]) {
          configuration.repositories[repository] = {
            environments: {}
          }
        }
        let response: any
        if (
          configElemKind === EConfigElemKind.all ||
          configElemKind === EConfigElemKind.url
        ) {
          response = await this.prompt({
            type: 'input',
            name: 'url',
            default: configuration.repositories[repository].url,
            message: `What is the url or path of the repository ? `
          })
          configuration.repositories[repository].url = response.url.trim()
        }
        if (
          configElemKind === EConfigElemKind.all ||
          configElemKind === EConfigElemKind.branch
        ) {
          response = await this.prompt({
            type: 'input',
            name: 'branch',
            default: configuration.repositories[repository].branch,
            message: `What is the branch to use for this repository ? `
          })
          configuration.repositories[repository].branch = response.branch.trim()
        }
        if (
          configElemKind === EConfigElemKind.all ||
          configElemKind === EConfigElemKind.command
        ) {
          response = await this.prompt({
            type: 'input',
            name: 'initCommand',
            default: configuration.repositories[repository].initCommand,
            message: `What is the initialisation command for this repository ? `
          })
          configuration.repositories[
            repository
          ].initCommand = response.initCommand.trim()
        }
        if (
          configElemKind === EConfigElemKind.all ||
          configElemKind === EConfigElemKind.environments
        ) {
          if (DEEP_INTERACTIVE_CONFIGURATION) {
            configureListOfItems({
              itemName: 'environment',
              itemList: Object.keys(
                configuration.repositories[repository].environments
              ),
              onModify: configureEnvironement,
              onAdd: () => {},
              onDelete: () => {}
            })
          } else {
            v.log(
              'For now, to edit environment, please modify directly the configuration file'
            )
          }
        }
      }.bind(this)
      const configureEnvironement = async function(
        this: Vorpal.CommandInstance,
        envName: string
      ) {
        let response: any
        v.log(`Configuring environment ${envName}`)
        response = await this.prompt({
          type: 'list',
          name: 'elem',
          message: 'What do you want to configure? ',
          choices: ['command', 'parameters', 'depends on', 'is ready when']
        })
        callback()
      }.bind(this)
      const configureListOfItems = async function(
        this: Vorpal.CommandInstance,
        inputs: {
          itemName: string
          itemList: string[]
          onModify: (element: string) => void
          onAdd: () => void
          onDelete: () => void
        }
      ) {
        const { itemList, itemName, onAdd, onDelete, onModify } = inputs
        let response: any
        response = await this.prompt({
          type: 'list',
          name: 'elem',
          message: `Here are the ${itemName}s available. You can modify one by selecting it, or add/remove it`,
          choices: [...itemList, ADD_CHOICE, REMOVE_CHOICE]
        })
        if (response.elem === ADD_CHOICE) {
          await onAdd()
        } else if (response.elem === REMOVE_CHOICE) {
          await onDelete()
        } else {
          await onModify(response.elem)
        }
      }.bind(this)
      const configureRepository = async function(
        this: Vorpal.CommandInstance,
        repository: any
      ) {
        let response: any = await this.prompt({
          type: 'list',
          name: 'elem',
          message: 'What do you want to configure? ',
          choices: [
            'all',
            'url',
            'branch',
            'initialization command',
            'environments'
          ]
        })
        const configurationElemKind: EConfigElemKind = response.elem
        await configureRepositoryElem({
          configElemKind: configurationElemKind,
          repository
        })
        return response
      }.bind(this)
      const configureRepositories = async function(
        this: Vorpal.CommandInstance) {
        await configureListOfItems({
          itemName: 'repository',
          itemList: Object.keys(configuration.repositories),
          onModify: configureRepository,
          onDelete: async () => {
            let response: any = await this.prompt({
              type: 'list',
              name: 'repository',
              message: 'Which repository should be removed? ',
              choices: Object.keys(configuration.repositories)
            })
            delete configuration.repositories[response.repository]
          },
          onAdd: async () => {
            let response: any
            response = await this.prompt({
              type: 'input',
              name: 'repositoryName',
              message: `What is the name of this repository? `
            })
            configuration.repositories[response.repositoryName] = {
              environments:{}
            }
            await configureRepository(response.repositoryName)
          }
        })
      }.bind(this)
      this.log(v.chalk['yellow']('Configuration of the repositories'))
      const isConfigFileExisting = isConfigFileInitialized()
      if (!isConfigFileExisting) {
        try {
          configuration = JSON.parse(
            await fsPromises.readFile(defaultConfigFilePath, 'utf8')
          )
          let response: any = await this.prompt({
            type: 'confirm',
            name: 'configureSetup',
            message:
              'No configuration found, do you want to configure one ? (if not, the default one will be used)'
          })
          if (response.configureSetup) {
            await configureWorkingPath()
            await configureRepositories()
          }
          configuration.$schema = 'file:' + schemaFilePath
          await fsPromises.writeFile(
            configFilePath,
            JSON.stringify(configuration, undefined, '\t'),
            { encoding: 'utf8' }
          )
        } catch (e) {
          v.log('ERROR', e)
        }
      } else {
        await configureRepositories()
        await fsPromises.writeFile(
          configFilePath,
          JSON.stringify(configuration, undefined, '\t'),
          { encoding: 'utf8' }
        )
      }
      callback()
    }
  )
  v.command('run', 'Select an environment to run (with all its dependencies)').action(
    async function(this: Vorpal.CommandInstance, args: any, callback: any) {
      await synchronise()
      let envs: string[] = getEnvironmentsNames()
      let response: any = await this.prompt({
        type: 'list',
        name: 'env',
        message: 'Which environment do you want to run ? ',
        choices: envs
      })
      await runEnvironement(response.env)
      callback()
    }
  )
  v.command('list', 'List all running environments').action(async function(
    this: Vorpal.CommandInstance,
    args: any,
    callback: any
  ) {
    this.log(v.chalk['green']('Here is the list of the running environments:'))
    const pids = Object.keys(runningCommands)
    for (const pid of pids) {
      v.log(`${runningCommands[pid].id} (pid:${pid})`)
    }
    callback()
  })
}
function getEnvironmentsNames(): string[] {
  const repositories = Object.keys(configuration.repositories)
  let envs: string[] = []
  for (const repo of repositories) {
    envs = envs.concat(
      Object.keys(configuration.repositories[repo].environments)
    )
  }
  return envs
}
function getEnvironments(): { [key: string]: ExecutionEnvironement } {
  const repositories = Object.keys(configuration.repositories)
  let finalEnvs: { [key: string]: ExecutionEnvironement } = {}
  for (const repo of repositories) {
    const envs = Object.keys(configuration.repositories[repo].environments)
    for (const env of envs) {
      const envObj = configuration.repositories[repo].environments[env]
      envObj.repo = repo
      envObj.id = env
      finalEnvs[env] = envObj
    }
  }
  return finalEnvs
}
async function runEnvironement(envName: string, color?: string) {
  return new Promise((resolve, reject) => {
    const env = getEnv(envName)
    if (!color) {
      color = pickRandomColor()
    }
    if (env && env.command) {
      if (env.currentPid !== undefined) {
        logDataForEnv(
          env.id,
          color,
          `ENVIRONMENT IS ALREADY RUNNING WITH PID ${env.currentPid}`
        )
        resolve()
      } else {
        logDataForEnv(env.id, color, 'STARTING ENVIRONMENT')
        const initCommand = configuration.repositories[env.repo!].initCommand
        if (initCommand) {
          logDataForEnv(env.id, color, 'INITIALISATION - START')
          const cmd = ChildProcess.exec(initCommand, {
            cwd: path.join(configuration.repoPath, env.repo!)
          })
          cmd.stdout.on('data', (data: any) => {
            logDataForEnv(envName, color!, data)
          })
          cmd.stderr.on('data', (data: any) => {
            logDataForEnv(envName, color!, data)
          })
          cmd.on('exit', async (code: any) => {
            logDataForEnv(envName, color!, 'INITIALISATION - END')
            resolve(executeEnvironement(env, color))
          })
          cmd.on('message', (message: any) => {
            logDataForEnv(envName, color!, message)
          })
        } else {
          resolve(executeEnvironement(env, color))
        }
      }
    }
  })
}
function getEnv(envName: string): ExecutionEnvironement {
  const envs = getEnvironments()
  const env = envs[envName]
  if (!env) {
    throw new Error(`Unknown environement ${envName}`)
  }
  return env
}
async function loadConfigFile() {
  configuration = JSON.parse(await fsPromises.readFile(configFilePath, 'utf8'))
}
function loadRepo(
  repoPath: string
): simplegit.SimpleGit | PromiseLike<simplegit.SimpleGit> {
  return simplegit(repoPath)
}
async function initializeRepo(repoPath: string) {
  await fsPromises.mkdir(repoPath)
  currentRepo = await simplegit(repoPath)
  currentRepo.init()
  return currentRepo
}
function isConfigFileInitialized() {
  return fs.existsSync(configFilePath)
}
function isRepoInitialized(repoPath: string) {
  return fs.existsSync(repoPath)
}
async function run() {
  v.show()
  const prettyFont = CFonts.render('E2E Tests|Runner', {
    font: 'chrome', 
    align: 'center', 
    colors: ['candy', 'candy', 'candy'], 
    background: 'transparent', 
    letterSpacing: 1, 
    lineHeight: 1, 
    space: true, 
    maxLength: '0' 
  })
  v.log(prettyFont.string)
  const isConfigFileExisting = isConfigFileInitialized()
  if (!isConfigFileExisting) {
    await v.exec('config')
  }
  await loadConfigFile()
  v.log(v.chalk['yellow'](`Config file is avaible at: ${configFilePath}, \nPlease do not hesitate to edit it directly with VSCode`))
  const repoPath = configuration.repoPath
  if (!isRepoInitialized(repoPath)) {
    currentRepo = await initializeRepo(repoPath)
  } else {
    currentRepo = await loadRepo(repoPath)
  }
  let runEnv = process.argv.slice(2)[0];
  if(runEnv) {
    await runEnvironement(runEnv)
    await v.exec('exit')
  } else {
    await v.exec('help')
  }
}
async function synchronise() {
  const repositories = Object.keys(configuration.repositories)
  for (const repository of repositories) {
    await synchroniseRepo(repository)
  }
}
async function synchroniseRepo(repository: string) {
  v.log(`SYNCHRONISATION OF ${repository} - START`)
  try {
    if (configuration.repositories[repository].url) {
      await currentRepo.submoduleAdd(
        configuration.repositories[repository].url!,
        path.join(configuration.repoPath, repository)
      )
    }
  } catch (e) {
  }
  const subModuleRepo = await simplegit(
    path.join(configuration.repoPath, repository)
  )
  if (configuration.repositories[repository].branch) {
    await subModuleRepo.checkout(configuration.repositories[repository].branch!)
  }
  v.log(`SYNCHRONISATION OF ${repository} - END`)
}
async function abort(e: Error) {
  v.log(`An error occured: ${e.toString()}`)
  v.exec('exit')
}
async function handleExit() {
  process.on('exit', async code => {
    await exitHandler({ cleanup: true }, code)
  })
  process.on('SIGINT', async code => {
    await exitHandler({ exit: true }, code)
  })
  process.on('SIGUSR1', async code => {
    await exitHandler({ exit: true }, code)
  })
  process.on('SIGUSR2', async code => {
    await exitHandler({ exit: true }, code)
  })
  process.on('uncaughtException', async code => {
    await exitHandler({ exit: true }, code)
  })
}
function exitHandler(options: any, exitCode: any) {
  const pids = Object.keys(runningCommands)
  for (const pid of pids) {
    v.log(`${runningCommands[pid].id} (pid:${pid})`)
    try {
      kill(pid)
    } catch (e) {
      v.log(`EXITING CLEANUP OF ${pid} FAILED WITH ERROR ${e.toString()}`)
    }
  }
  if (exitCode || exitCode === 0) v.log(`EXITING WITH CODE ${exitCode}`)
  if (options.exit) process.exit(0)
}
async function logDataForEnv(envName: string, color: string, data: any) {
  if (data) {
    data = data.toString().trim()
    if (data) {
      const chunks = data.split('\n')
      for (const chunk of chunks) {
        v.log(v.chalk[color!](`[${envName.padEnd(6, ' ')}] ${chunk}`))
      }
    }
  }
}
async function executeEnvironement(env: ExecutionEnvironement, color?: string) {
  return new Promise(async (resolve, reject) => {
    if (!color) {
      color = pickRandomColor()
    }
    if (env.dependsOn && env.dependsOn.length > 0) {
      await Promise.all(env.dependsOn.map(depEnv => runEnvironement(depEnv)))
    }
    const cmd = env.arguments
      ? ChildProcess.spawn(env.command!, env.arguments, {
          cwd: path.join(configuration.repoPath, env.repo!)
        })
      : ChildProcess.exec(env.command!, {
          cwd: path.join(configuration.repoPath, env.repo!)
        })
    runningCommands[cmd.pid] = env
    env.currentPid = cmd.pid
    cmd.stdout.on('data', async (data: any) => {
      logDataForEnv(env.id, color!, data)
      if (env.readyWhen) {
        if (env.readyWhen.consoleMessageIsFound) {
          const matchedValue = checkAndparseParametrizedString(
            env.readyWhen.consoleMessageIsFound,
            data
          )
          if (matchedValue !== null) {
            logDataForEnv(
              env.id,
              color!,
              `ENVIRONMENT READY ON PORT ${matchedValue.port}`
            )
            resolve()
          }
        }
        if (env.readyWhen.portIsUp) {
          const status = await portscanner.checkPortStatus(
            env.readyWhen.portIsUp
          )
          if (status === 'closed') {
            logDataForEnv(
              env.id,
              color!,
              `ENVIRONMENT READY ON PORT ${env.readyWhen.portIsUp}`
            )
            resolve()
          }
        }
      }
    })
    cmd.stderr.on('data', (data: any) => {
      logDataForEnv(env.id, color!, data)
    })
    cmd.on('exit', (code: any, ...args) => {
      if (runningCommands[cmd.pid]) {
        logDataForEnv(env.id, color!, `ENVIRONMENT ENDED WITH CODE ${code}`)
      }
      resolve(code)
      delete env.currentPid
      delete runningCommands[cmd.pid]
    })
    cmd.on('close', (code: any) => {
      if (runningCommands[cmd.pid]) {
        logDataForEnv(env.id, color!, `ENVIRONMENT ENDED WITH CODE ${code}`)
      }
      resolve(code)
      delete env.currentPid
      delete runningCommands[cmd.pid]
    })
  })
}
