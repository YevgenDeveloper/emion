import ChildProcess from 'child_process'
export default class ChildProcessEnventsHandler {
  public shouldExecuteInsteadOfSpawn: boolean
  public childProcessId: number
  public command: string
  public commandArguments?: string[]
  public commandCurrentWorkingDir: string
  public onInit: () => void
  public onNewDataFromStandardOutput: (data: any, pid: number) => void
  public onNewDataFromErrorOutput: (data: any, pid: number) => void
  public onExit: (code: number, pid: number) => void
  public async execute(): Promise<number> {
    if (this.onInit) {
      await this.onInit()
    }
    const cmd = !this.shouldExecuteInsteadOfSpawn
      ? ChildProcess.spawn(this.command, this.commandArguments, {
        cwd: this.commandCurrentWorkingDir
      })
      : ChildProcess.exec(this.command, {
        cwd: this.commandCurrentWorkingDir
      })
    this.childProcessId = cmd.pid
    cmd.stdout?.on('data', async (data: any) => {
      if (this.onNewDataFromStandardOutput) {
        await this.onNewDataFromStandardOutput(data, this.childProcessId)
      }
    })
    cmd.on('message', async (data: any) => {
      if (this.onNewDataFromStandardOutput) {
        await this.onNewDataFromStandardOutput(data, this.childProcessId)
      }
    })
    cmd.stderr?.on('data', async (data: any) => {
      if (this.onNewDataFromErrorOutput) {
        await this.onNewDataFromErrorOutput(data, this.childProcessId)
      }
    })
    cmd.on('exit', async (code: number, ...args) => {
      if (this.onExit) {
        await this.onExit(code, this.childProcessId)
      }
    })
    cmd.on('close', async (code: number) => {
      if (this.onExit) {
        await this.onExit(code, this.childProcessId)
      }
    })
    return this.childProcessId
  }
}
