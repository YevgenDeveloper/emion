import ChildProcessEnventsHandler from '@/childProcessEventsHandlers'
export default class ChildProcessEnventsHandlerBuilder {
  public static aChildProcessEventsHandler() {
    return new ChildProcessEnventsHandlerBuilder()
  }
  private eventHandler: ChildProcessEnventsHandler
  constructor() {
    this.eventHandler = new ChildProcessEnventsHandler()
  }
  public asSpawnedProcess() {
    this.eventHandler.shouldExecuteInsteadOfSpawn = false
    return this
  }
  public asExececutedProcess() {
    this.eventHandler.shouldExecuteInsteadOfSpawn = true
    return this
  }
  public withCommand(command: string) {
    this.eventHandler.command = command
    return this
  }
  public withCommandArguments(commandArgs?: string[]) {
    this.eventHandler.commandArguments = commandArgs
    return this
  }
  public withCommandCurrentWorkindDir(commandCwd: string) {
    this.eventHandler.commandCurrentWorkingDir = commandCwd
    return this
  }
  public withOnInitCallBack(onInitCallBack: () => void) {
    this.eventHandler.onInit = onInitCallBack
    return this
  }
  public withOnExitCallBack(onExitCallBack: (code: number, pid: number) => void) {
    this.eventHandler.onExit = onExitCallBack
    return this
  }
  public withOnNewDataFromStandardOutputCallBack(onNewStandardDataCalllBack: (data: any, pid: number) => void) {
    this.eventHandler.onNewDataFromStandardOutput = onNewStandardDataCalllBack
    return this
  }
  public withOnNewDataFromErrorOutputCallBack(onNewErrorDataCalllBack: (data: any, pid: number) => void) {
    this.eventHandler.onNewDataFromErrorOutput = onNewErrorDataCalllBack
    return this
  }
  public build() {
    return this.eventHandler
  }
}
