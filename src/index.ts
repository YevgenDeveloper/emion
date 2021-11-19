import Vorpal from 'vorpal'
import fs from 'fs'
import CFonts from 'cfonts'
import {
  configureWorkingPath,
  configureRepositories
} from './configurationSteps'
import { getConfigHandler } from './configurationHandler'
import GitHandler from './gitHandler'
import EnvironmentsRunner from './environmentsRunner'
const v: Vorpal = new Vorpal()
const run = async function() {
  try {
    await plugInExitHandler()
    await initializeCommands()
    await start()
  } catch(e) {
    v.log(`An error occured: ${e.toString()}`)
    v.exec('exit')
  }
}
async function initializeCommands() {
  v.command(
    'config',
    'Configure the different repository to use and their environments (Work in Progress)'
  ).action(async function(
    this: Vorpal.CommandInstance,
    args: any,
    callback: any
  ) {
    this.log((v as any).chalk['yellow']('Configuration of the repositories'))
    const isConfigFileExisting = getConfigHandler().isConfigFileInitialized()
    if (!isConfigFileExisting) {
      try {
        await getConfigHandler().loadDefaultConfigFile()
        let response: any = await this.prompt({
          type: 'confirm',
          name: 'configureSetup',
          message:
            'No configuration found, do you want to configure one ? (if not, the default one will be used)'
        })
        if (response.configureSetup) {
          await configureWorkingPath(this)
          await configureRepositories(this)
        }
        await getConfigHandler().save()
      } catch (e) {
        v.log('ERROR', e)
      }
    } else {
      await configureRepositories(this)
      await getConfigHandler().save()
    }
    callback()
  } as Vorpal.Action)
  v.command(
    'run',
    'Select an environment to run (with all its dependencies)'
  ).action(async function(
    this: Vorpal.CommandInstance,
    args: any,
    callback: any
  ) {
    await GitHandler.getGitHandler(v).synchronise()
    let envs: string[] = getConfigHandler().getEnvironmentsNames()
    let response: any = await this.prompt({
      type: 'list',
      name: 'env',
      message: 'Which environment do you want to run ? ',
      choices: envs
    })
    EnvironmentsRunner.getEnvironmentsRunner().initialize(v)
    await EnvironmentsRunner.getEnvironmentsRunner().runEnvironement(response.env)
    callback()
  } as Vorpal.Action)
  v.command('list', 'List all running environments').action(async function(
    this: Vorpal.CommandInstance,
    args: any,
    callback: any
  ) {
    this.log((v as any).chalk['green']('Here is the list of the running environments:'))
    const runningCommands = EnvironmentsRunner.getEnvironmentsRunner().getRunningCommands()
    const pids = Object.keys(runningCommands)
    for (const pid of pids) {
      v.log(`${runningCommands[pid].id} (pid:${pid})`)
    }
    callback()
  } as Vorpal.Action)
}
async function start() {
  v.show()
  const prettyFont = CFonts.render('Environments|Orchestrator', {
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
  const isConfigFileExisting = getConfigHandler().isConfigFileInitialized()
  if (!isConfigFileExisting) {
    await v.exec('config')
  }
  await getConfigHandler().loadConfigFile()
  v.log(
    (v as any).chalk['yellow'](
      `Config file is avaible at: ${getConfigHandler().getConfigFilePath()}, \nPlease do not hesitate to edit it directly with VSCode`
    )
  )
  const repoPath = getConfigHandler().getRepoPath()
  if (!GitHandler.getGitHandler(v).isRepoInitialized(repoPath)) {
    await GitHandler.getGitHandler(v).initializeRepo(repoPath)
  } else {
    await GitHandler.getGitHandler(v).loadRepo(repoPath)
  }
  let runEnv = process.argv.slice(2)[0]
  if (runEnv) {
    await GitHandler.getGitHandler(v).synchronise()
    EnvironmentsRunner.getEnvironmentsRunner().initialize(v)
    await EnvironmentsRunner.getEnvironmentsRunner().runEnvironement(runEnv)
    await v.exec('exit')
  } else {
    await v.exec('help')
  }
}
async function plugInExitHandler() {
  function exitHandler(options: any, exitCode: any) {
    if(options.cleanup) {
      EnvironmentsRunner.getEnvironmentsRunner().cleanRunningCommands()
    }
    if (exitCode || exitCode === 0) 
    if (options.exit) process.exit(0)
  }
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
run()
