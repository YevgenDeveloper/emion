import ChildProcessEnventsHandlerBuilder from '@/childProcessEventsHandlerBuilder'
import { IExecutionEnvironement } from '@/configuration.interface'
import { getConfigHandler } from '@/configurationHandler'
import { checkAndparseParametrizedString, getEnvLoggerForEnvironement, kill, LogStartEnd, pickRandomColor } from '@/utils'
import path from 'path'
import * as portscanner from 'portscanner'
import Vorpal from 'vorpal'
let runner: EnvironmentsRunner
export default class EnvironmentsRunner {
  public static getEnvironmentsRunner() {
    if (!runner) {
      runner = new EnvironmentsRunner()
    }
    return runner
  }
  private runningCommands: { [key: string]: IExecutionEnvironement }
  private logDataForEnv: any
  private vorpal: Vorpal
  constructor() {
    this.runningCommands = {}
  }
  public initialize(vorpal: Vorpal) {
    this.logDataForEnv = getEnvLoggerForEnvironement(vorpal)
    this.vorpal = vorpal
  }
  @LogStartEnd()
  public cleanRunningCommands() {
    this.vorpal.log('PROCESS CLEANING BEGIN')
    const pids = Object.keys(this.runningCommands)
    for (const pid of pids) {
      this.vorpal.log(`${this.runningCommands[pid].id} (pid:${pid})`)
      try {
        kill(this.vorpal, pid)
      } catch (e) {
        this.vorpal.log(`CLEANUP OF ${pid} FAILED WITH ERROR ${e.toString()}`)
      }
    }
    this.vorpal.log('PROCESS CLEANING SUCCESSFULL')
  }
  @LogStartEnd()
  public getRunningCommands() {
    return this.runningCommands
  }
  @LogStartEnd()
  public async runEnvironement(envName: string, color?: string) {
    return new Promise((resolve, reject) => {
      const env = getConfigHandler().getEnvironment(envName)
      if (!color) {
        color = pickRandomColor()
      }
      if (env && env.command) {
        if (env.currentPid !== undefined) {
          this.logDataForEnv({
            envName: env.id,
            color,
            data: `ENVIRONMENT IS ALREADY RUNNING WITH PID ${env.currentPid}`
          })
          resolve()
        } else {
          this.logDataForEnv({
            envName: env.id,
            color,
            data: 'STARTING ENVIRONMENT'
          })
          const initCommand = getConfigHandler().getRepository(env.repo!).initCommand
          if (initCommand) {
            ChildProcessEnventsHandlerBuilder.aChildProcessEventsHandler()
              .asExececutedProcess()
              .withCommand(initCommand)
              .withCommandCurrentWorkindDir(path.join(getConfigHandler().getRepoPath(), env.repo!))
              .withOnInitCallBack(() => {
                this.logDataForEnv({
                  envName: env.id,
                  color,
                  data: 'INITIALISATION - START'
                })
              })
              .withOnNewDataFromStandardOutputCallBack((data) => {
                this.logDataForEnv({ envName, color, data })
              })
              .withOnNewDataFromErrorOutputCallBack((data) => {
                this.logDataForEnv({ envName, color, data })
              })
              .withOnExitCallBack((data) => {
                this.logDataForEnv({
                  envName,
                  color,
                  data: 'INITIALISATION - END'
                })
                resolve(this.executeEnvironement({ env, color }))
              })
              .build()
              .execute()
          } else {
            resolve(this.executeEnvironement({ env, color }))
          }
        }
      }
    })
  }
  @LogStartEnd()
  public async executeEnvironement(inputs: { env: IExecutionEnvironement, color?: string }) {
    const { env, color } = inputs
    let pickedColor: string
    return new Promise(async (resolve, reject) => {
      if (!color) {
        pickedColor = pickRandomColor()
      } else {
        pickedColor = color
      }
      if (env.dependsOn && env.dependsOn.length > 0) {
        await Promise.all(env.dependsOn.map((depEnv) => this.runEnvironement(depEnv)))
      }
      let builder = ChildProcessEnventsHandlerBuilder.aChildProcessEventsHandler()
      builder = env.arguments ? builder.asSpawnedProcess() : builder.asExececutedProcess()
      const pid = await builder
        .withCommand(env.command!)
        .withCommandArguments(env.arguments)
        .withCommandCurrentWorkindDir(path.join(getConfigHandler().getRepoPath(), env.repo!))
        .withOnNewDataFromStandardOutputCallBack(async (data) => {
          this.logDataForEnv({ envName: env.id, color: pickedColor, data })
          if (env.readyWhen) {
            if (env.readyWhen.consoleMessageIsFound && !env.ready) {
              const matchedValue = checkAndparseParametrizedString(
                env.readyWhen.consoleMessageIsFound,
                data
              )
              if (matchedValue !== null) {
                this.logDataForEnv({
                  envName: env.id,
                  color: pickedColor,
                  data: `ENVIRONMENT READY ON PORT ${matchedValue.port}`
                }
                )
                env.ready = true
                resolve()
              }
            }
            if (env.readyWhen.portIsUp && !env.ready) {
              const status = await portscanner.checkPortStatus(
                env.readyWhen.portIsUp
              )
              if (status === 'closed') {
                this.logDataForEnv({
                  envName: env.id,
                  color: pickedColor,
                  data: `ENVIRONMENT READY ON PORT ${env.readyWhen.portIsUp}`
                }
                )
                env.ready = true
                resolve()
              }
            }
          }
        })
        .withOnNewDataFromErrorOutputCallBack((data) => {
          this.logDataForEnv({ envName: env.id, pickedColor, data })
        })
        .withOnExitCallBack((code, currentPid) => {
          if (this.runningCommands[currentPid]) {
            this.logDataForEnv({ envName: env.id, pickedColor, data: `ENVIRONMENT ENDED WITH CODE ${code}` })
          }
          resolve(code)
          delete env.currentPid
          delete this.runningCommands[currentPid]
        })
        .build()
        .execute()
      this.runningCommands[pid] = env
      env.currentPid = pid
    })
  }
}
