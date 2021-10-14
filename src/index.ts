import vorpal from 'vorpal'
import fs from 'fs'
import path from 'path'
import {
  ConfigSchema,
  EConfigElemType as EConfigElemKind,
  ExecutionEnvironement
} from './config.interface'
import CFonts from 'cfonts'
import simplegit from 'simple-git/promise'
let currentRepo: simplegit.SimpleGit
import ChildProcess, { exec } from 'child_process'
import { pickRandomColor, kill, checkAndparseParametrizedString } from './utils';
import  * as portscanner from 'portscanner'
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
handleExit()
init().then(run, abort)
async function init() {
  v.command('config', 'Configure the different repos to use').action(
    async function(this: Vorpal.CommandInstance, args: any, callback: any) {
      const configureRepository = async function(
        this: Vorpal.CommandInstance,
        inputs: {
          configuration: ConfigSchema
          configElemKind: string
          repository: string
        }
      ) {
        const { configuration, configElemKind, repository } = inputs
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
            message: `Entrez l'url du repo '${repository}': `
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
            message: `Entrez la branche à utiliser pour le repo '${repository}': `
          })
          configuration.repositories[repository].branch = response.branch.trim()
        }
      }.bind(this)
      const configureWorkingPath = async function(
        this: Vorpal.CommandInstance,
        inputs: {
          configuration: ConfigSchema
        }
      ) {
        const { configuration } = inputs
        let response: any
        response = await this.prompt({
          type: 'input',
          name: 'repoPath',
          default: configuration.repoPath,
          message: `Dans quel dossier dois-je runner tous les projects?`
        })
        configuration.repoPath = response.repoPath.trim()
      }.bind(this)
      this.log(v.chalk['yellow']('Configuration des repos'))
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
              'Pas de configuration, voulez-vous en définir une ? (sinon celle par défault sera choisie)'
          })
          await configureWorkingPath({ configuration })
          if (response.configureSetup) {
            const repositories = Object.keys(configuration.repositories!)
            for (const repository of repositories) {
              await configureRepository({
                configuration,
                configElemKind: EConfigElemKind.all,
                repository
              })
            }
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
        let response: any = await this.prompt({
          type: 'list',
          name: 'section',
          message: 'Que voulez-vous configurer? ',
          choices: Object.keys(configuration.repositories!)
        })
        const repository: string = response.section
        response = await this.prompt({
          type: 'list',
          name: 'elem',
          message: 'Que voulez-vous configurer? ',
          choices: ['tous', 'url', 'branche', 'commande']
        })
        const configurationElemKind: EConfigElemKind = response.elem
        await configureRepository({
          configuration,
          configElemKind: configurationElemKind,
          repository
        })
        await fsPromises.writeFile(
          configFilePath,
          JSON.stringify(configuration, undefined, '\t'),
          { encoding: 'utf8' }
        )
      }
      callback()
    }
  )
  v.command('run', 'run all the different repos alltogether').action(
    async function(this: Vorpal.CommandInstance, args: any, callback: any) {
      this.log(v.chalk['green']('Run'))
      await synchronise()
      let envs: string[] = getEnvironmentsNames()
      let response: any = await this.prompt({
        type: 'list',
        name: 'env',
        message: 'Quel environement voulez-vous lancer ?',
        choices: envs
      })
      await runEnvironement(response.env)
      callback()
    }
  )
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
      const envObj = { ...configuration.repositories[repo].environments[env] }
      envObj.repo = repo
      envObj.id = env
      finalEnvs[env] = envObj
    }
  }
  return finalEnvs
}
async function runEnvironement(envName: string, color?: string) {
  return new Promise((resolve,reject) => {
    v.log('RUNNING ENV', JSON.stringify(envName))
    const env = getEnv(envName)
    v.log('RUNNING ENV',  JSON.stringify(env))
    if(!color) {
      color = pickRandomColor()
    }
    if (env.command) {
      const initCommand = configuration.repositories[env.repo!].initCommand
      if (initCommand) {
        v.log('INIT:', initCommand)
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
          logDataForEnv(envName, color!, 'Init done')
          resolve(executeEnvironement(env, color))
        })
        cmd.on('message', (message: any) => {
          logDataForEnv(envName, color!, message)
        })
      } else {
        resolve(executeEnvironement(env, color))
      }
  }
  })
}
function getEnv(envName: string ): ExecutionEnvironement {
  const envs = getEnvironments()
  const env = envs[envName]
  if(!env) {
    throw new Error (`Unknown environement ${envName}`)
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
  const repoPath = configuration.repoPath
  if (!isRepoInitialized(repoPath)) {
    currentRepo = await initializeRepo(repoPath)
  } else {
    currentRepo = await loadRepo(repoPath)
  }
  await v.exec('help')
}
async function synchronise() {
  const repositories = Object.keys(configuration.repositories)
  for (const repository of repositories) {
    await synchroniseRepo(repository)
  }
}
async function synchroniseRepo(repository: string) {
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
  v.log('Synchronisation of', repository)
}
async function abort(e: Error) {
  v.log(e.toString())
  v.exec('exit')
}
async function handleExit() {
  process.on('exit', async (code) => {
    await exitHandler({ cleanup: true }, code)
  })
  process.on('SIGINT', async (code) => {
    await exitHandler({ exit: true },code)
  })
  process.on('SIGUSR1', async (code) => {
    await exitHandler({ exit: true }, code)
  })
  process.on('SIGUSR2', async (code) => {
    await exitHandler({ exit: true },code )
  })
  process.on('uncaughtException', async (code) => {
    await exitHandler({ exit: true }, code)
  })
}
async function exitHandler(options: any, exitCode: any) {
  const pids = Object.keys(runningCommands)
  for (const pid of pids) {
    await kill(pid)
  }
  if (exitCode || exitCode === 0) v.log(exitCode)
  if (options.exit) process.exit()
}
async function logDataForEnv(envName:string, color: string, data:any) {
  data =  data.trim()
  if(data) {
    const chunks = data.split('\n')
    for(const chunk of chunks) {
      v.log(v.chalk[color!](`[${envName.padEnd(6,' ')}] ${chunk}`))
    }
  }
}
async function executeEnvironement(env: ExecutionEnvironement, color?: string) {
  return new Promise(async (resolve, reject) => {
    if(!color) {
      color = pickRandomColor()
    }
    if(env.dependsOn && env.dependsOn.length>0) {
      v.log('DEPENDCIES: '+ JSON.stringify(env.dependsOn) )
      await Promise.all(env.dependsOn.map(depEnv => runEnvironement(depEnv)))
    }
    v.log('COMMAND: ' +  JSON.stringify(env.command))
    v.log('READY WHEN: ' +  JSON.stringify(env.readyWhen))
    const cmd = ChildProcess.exec(env.command!, {
      cwd: path.join(configuration.repoPath, env.repo!)
    })
    runningCommands[cmd.pid] = env
    cmd.stdout.on('data', async (data: any) => {
      logDataForEnv(env.id, color!, data)
      if(env.readyWhen) {
        if(env.readyWhen.consoleMessageIsFound) {
          const matchedValue = checkAndparseParametrizedString(env.readyWhen.consoleMessageIsFound, data)
          if(matchedValue !== null) {
            logDataForEnv(env.id, color!, `ENVIRONEMENT READY ON PORT ${matchedValue.port}`)
            resolve()
          }
        }
        if(env.readyWhen.portIsUp) {
          const status =  await portscanner.checkPortStatus(env.readyWhen.portIsUp)
          if(status === 'closed') {
            logDataForEnv(env.id, color!, `ENVIRONEMENT READY ON PORT ${env.readyWhen.portIsUp}`)
            resolve()
          }
        }
      }
    })
    cmd.stderr.on('data', (data: any) => {
      console.log('ERROR')
      logDataForEnv(env.id, color!, data)
    })
    cmd.on('exit', (code: any) => {
      logDataForEnv(env.id, color!, `Environement ${runningCommands[cmd.pid]} ended with code ${code}`) 
      resolve(code)
      delete runningCommands[cmd.pid]
    })
    cmd.on('close', (code: any) => {
      logDataForEnv(env.id, color!, `Environement ${runningCommands[cmd.pid]} ended with code ${code}`) 
      resolve(code)
      delete runningCommands[cmd.pid]
    })
  })
}
