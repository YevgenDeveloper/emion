import { getConfigHandler } from './configurationHandler';
import { ExecutionEnvironement } from './configuration.interface';
import {
  kill,
} from './utils'
import Vorpal from 'vorpal'
import ChildProcess from 'child_process'
import {
  pickRandomColor,
  checkAndparseParametrizedString,
  getEnvLoggerForEnvironement,
} from './utils'
import * as portscanner from 'portscanner'
import path from 'path'
let runner: EnvironmentsRunner
export default class EnvironmentsRunner {
    private runningCommands: {[key: string]: ExecutionEnvironement}
    private logDataForEnv: any
    private vorpal: Vorpal
    public static getEnvironmentsRunner() {
        if(!runner) {
            runner = new EnvironmentsRunner()
        }
        return runner
    }
    constructor () {
      this.runningCommands = {}
    }
    public initialize(vorpal: Vorpal) {
        this.logDataForEnv = getEnvLoggerForEnvironement(vorpal)
        this.vorpal = vorpal
    }
public cleanRunningCommands() {
  this.vorpal.log(`PROCESS CLEANING BEGIN`)
  const pids = Object.keys(this.runningCommands)
  for (const pid of pids) {
    this.vorpal.log(`${this.runningCommands[pid].id} (pid:${pid})`)
    try {
      kill(this.vorpal, pid)
    } catch (e) {
      this.vorpal.log(`CLEANUP OF ${pid} FAILED WITH ERROR ${e.toString()}`)
    }
  }
  this.vorpal.log(`PROCESS CLEANING SUCCESSFULL`)
}
public getRunningCommands() {
  return this.runningCommands
}
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
            this.logDataForEnv({
              envName: env.id,
              color,
              data: 'INITIALISATION - START'
            })
            const cmd = ChildProcess.exec(initCommand, {
              cwd: path.join(getConfigHandler().getRepoPath(), env.repo!)
            })
            cmd.stdout.on('data', (data: any) => {
              this.logDataForEnv({ envName, color, data })
            })
            cmd.stderr.on('data', (data: any) => {
              this.logDataForEnv({ envName, color, data })
            })
            cmd.on('exit', async (code: any) => {
              this.logDataForEnv({
                envName,
                color,
                data: 'INITIALISATION - END'
              })
              resolve(this.executeEnvironement({env, color}))
            })
            cmd.on('message', (message: any) => {
              this.logDataForEnv({ envName, color, data: message })
            })
          } else {
            resolve(this.executeEnvironement({env, color}))
          }
        }
      }
    })
  }
  public async executeEnvironement(inputs:{env: ExecutionEnvironement, color?: string}) {
    const {env, color}= inputs
    let pickedColor: string
    return new Promise(async (resolve, reject) => {
      if (!color) {
        pickedColor = pickRandomColor()
      } else {
        pickedColor = color 
      }
      if (env.dependsOn && env.dependsOn.length > 0) {
        await Promise.all(env.dependsOn.map(depEnv => this.runEnvironement(depEnv)))
      }
      const cmd = env.arguments
        ? ChildProcess.spawn(env.command!, env.arguments, {
            cwd: path.join(getConfigHandler().getRepoPath(), env.repo!)
          })
        : ChildProcess.exec(env.command!, {
            cwd: path.join(getConfigHandler().getRepoPath(), env.repo!)
          })
      this.runningCommands[cmd.pid] = env
      env.currentPid = cmd.pid
      cmd.stdout.on('data', async (data: any) => {
        this.logDataForEnv({envName:env.id, color:pickedColor, data})
        if (env.readyWhen) {
          if (env.readyWhen.consoleMessageIsFound) {
            const matchedValue = checkAndparseParametrizedString(
              env.readyWhen.consoleMessageIsFound,
              data
            )
            if (matchedValue !== null) {
              this.logDataForEnv({
                  envName:env.id,
                  color: pickedColor,
                  data:`ENVIRONMENT READY ON PORT ${matchedValue.port}`
                }
              )
              resolve()
            }
          }
          if (env.readyWhen.portIsUp) {
            const status = await portscanner.checkPortStatus(
              env.readyWhen.portIsUp
            )
            if (status === 'closed') {
              this.logDataForEnv({
                  envName:env.id,
                  color: pickedColor,
                  data:`ENVIRONMENT READY ON PORT ${env.readyWhen.portIsUp}`
                }
              )
              resolve()
            }
          }
        }
      })
      cmd.stderr.on('data', (data: any) => {
        this.logDataForEnv({envName:env.id, pickedColor, data})
      })
      cmd.on('exit', (code: any, ...args) => {
        if (this.runningCommands[cmd.pid]) {
          this.logDataForEnv({envName:env.id, pickedColor, data:`ENVIRONMENT ENDED WITH CODE ${code}`})
        }
        resolve(code)
        delete env.currentPid
        delete this.runningCommands[cmd.pid]
      })
      cmd.on('close', (code: any) => {
        if (this.runningCommands[cmd.pid]) {
          this.logDataForEnv({envName:env.id, pickedColor, data:`ENVIRONMENT ENDED WITH CODE ${code}`})
        }
        resolve(code)
        delete env.currentPid
        delete this.runningCommands[cmd.pid]
      })
    })
  }
}
