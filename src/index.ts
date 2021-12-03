#!/usr/bin/env node
import CFonts from 'cfonts'
import Vorpal from 'vorpal'
import { getConfigHandler } from './configurationHandler'
import { configureRepositories, configureWorkingPath } from './configurationSteps'
import EnvironmentsRunner from './environmentsRunner'
import GitHandler from './gitHandler'
import { vorpalLog } from './utils'
const v: Vorpal = new Vorpal()
const run = async (configFilePath: string) => {
  try {
    await plugInExitHandler()
    await initializeCommands(configFilePath)
    await start(configFilePath)
  } catch (e) {
    vorpalLog(v, `An error occured: ${e.toString()}`)
    v.exec('exit')
  }
}
async function initializeCommands(configFilePath: string) {
  v.command(
    'config',
    'Configure the different repository to use and their environments (Work in Progress)'
  ).action(async function (
    this: Vorpal.CommandInstance,
    args: any,
    callback: any
  ) {
    this.log((v as any).chalk.yellow('Configuration of the repositories'))
    const isConfigFileExisting = getConfigHandler().isConfigFileExisting(configFilePath)
    if (!isConfigFileExisting) {
      try {
        await getConfigHandler().loadDefaultConfigFile()
        const response: any = await this.prompt({
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
        vorpalLog(v, 'ERROR' + e.toString())
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
  ).action(
    async function (
      this: Vorpal.CommandInstance,
      args: any,
      callback: any
    ) {
      await GitHandler.getGitHandler(v).synchronise()
      const envs: string[] = getConfigHandler().getEnvironmentsNames()
      const response: any = await this.prompt({
        type: 'list',
        name: 'env',
        message: 'Which environment do you want to run ? ',
        choices: envs
      })
      EnvironmentsRunner.getEnvironmentsRunner().initialize(v)
      await EnvironmentsRunner.getEnvironmentsRunner().runEnvironement(response.env)
      callback()
    } as Vorpal.Action)
  v.command('list', 'List all running environments').action(
    async function (
      this: Vorpal.CommandInstance,
      args: any,
      callback: any
    ) {
      this.log((v as any).chalk.green('Here is the list of the running environments:'))
      const runningCommands = EnvironmentsRunner.getEnvironmentsRunner().getRunningCommands()
      const pids = Object.keys(runningCommands)
      for (const pid of pids) {
        vorpalLog(v, `${runningCommands[pid].id} (pid:${pid})`)
      }
      callback()
    } as Vorpal.Action)
}
async function start(configFilePath: string) {
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
  vorpalLog(v, prettyFont.string)
  const isConfigFileExisting = getConfigHandler().isConfigFileExisting(configFilePath)
  if (!isConfigFileExisting) {
    await v.exec('config')
  }
  await getConfigHandler().loadConfigFile(configFilePath)
  vorpalLog(v,
    (v as any).chalk.yellow(
      `Config file is avaible at: ${getConfigHandler().getConfigFilePath()}, \nPlease do not hesitate to edit it directly with VSCode`
    )
  )
  const repoPath = getConfigHandler().getRepoPath()
  if (!GitHandler.getGitHandler(v).isRepoInitialized(repoPath)) {
    await GitHandler.getGitHandler(v).initializeRepo(repoPath)
  } else {
    await GitHandler.getGitHandler(v).loadRepo(repoPath)
  }
  const runEnv = process.argv.slice(3)[0]
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
    if (options.cleanup) {
      EnvironmentsRunner.getEnvironmentsRunner().cleanRunningCommands()
    }
    if (exitCode || exitCode === 0) {
      if (options.exit) { process.exit(0) }
    }
  }
  process.on('exit', async (code) => {
    await exitHandler({ cleanup: true }, code)
  })
  process.on('SIGINT', async (code) => {
    await exitHandler({ exit: true }, code)
  })
  process.on('SIGUSR1', async (code) => {
    await exitHandler({ exit: true }, code)
  })
  process.on('SIGUSR2', async (code) => {
    await exitHandler({ exit: true }, code)
  })
  process.on('uncaughtException', async (code) => {
    await exitHandler({ exit: true }, code)
  })
}
const [nodePath, scriptPath, cfgFilePath] = process.argv
run(cfgFilePath)
