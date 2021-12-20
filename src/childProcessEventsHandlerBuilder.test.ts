import ChildProcessEnventsHandlerBuilder from '@/childProcessEventsHandlerBuilder'
import ChildProcessEnventsHandler from '@/childProcessEventsHandlers'
import test from 'ava'
test('It should be able to build an child process event handler correctly for execute', (t) => {
  const fn1 = (a: any, b: any) => undefined
  const fn2 = (a: any, b: any) => undefined
  const fn3 = (a: any, b: any) => undefined
  const fn4 = () => undefined
  const CMD = 'cmd'
  const CMD_ARGS = ['arg1']
  const CMD_CWD = 'path'
  const cpeh = ChildProcessEnventsHandlerBuilder.aChildProcessEventsHandler()
    .asExececutedProcess()
    .withCommand(CMD)
    .withCommandArguments(CMD_ARGS)
    .withCommandCurrentWorkindDir(CMD_CWD)
    .withOnNewDataFromErrorOutputCallBack(fn1)
    .withOnNewDataFromStandardOutputCallBack(fn2)
    .withOnExitCallBack(fn3)
    .withOnInitCallBack(fn4)
    .build()
  const expectedCpeh = new ChildProcessEnventsHandler()
  expectedCpeh.shouldExecuteInsteadOfSpawn = true
  expectedCpeh.command = CMD
  expectedCpeh.commandArguments = CMD_ARGS
  expectedCpeh.commandCurrentWorkingDir = CMD_CWD
  expectedCpeh.onNewDataFromErrorOutput = fn1
  expectedCpeh.onNewDataFromStandardOutput = fn2
  expectedCpeh.onExit = fn3
  expectedCpeh.onInit = fn4
  t.deepEqual(cpeh, expectedCpeh)
})
test('It should be able to build an child process event handler correctly for spawn', (t) => {
  const fn1 = (a: any, b: any) => undefined
  const fn2 = (a: any, b: any) => undefined
  const fn3 = (a: any, b: any) => undefined
  const fn4 = () => undefined
  const CMD = 'cmd'
  const CMD_ARGS = ['arg1']
  const CMD_CWD = 'path'
  const cpeh = ChildProcessEnventsHandlerBuilder.aChildProcessEventsHandler()
    .asSpawnedProcess()
    .withCommand(CMD)
    .withCommandArguments(CMD_ARGS)
    .withCommandCurrentWorkindDir(CMD_CWD)
    .withOnNewDataFromErrorOutputCallBack(fn1)
    .withOnNewDataFromStandardOutputCallBack(fn2)
    .withOnExitCallBack(fn3)
    .withOnInitCallBack(fn4)
    .build()
  const expectedCpeh = new ChildProcessEnventsHandler()
  expectedCpeh.shouldExecuteInsteadOfSpawn = false
  expectedCpeh.command = CMD
  expectedCpeh.commandArguments = CMD_ARGS
  expectedCpeh.commandCurrentWorkingDir = CMD_CWD
  expectedCpeh.onNewDataFromErrorOutput = fn1
  expectedCpeh.onNewDataFromStandardOutput = fn2
  expectedCpeh.onExit = fn3
  expectedCpeh.onInit = fn4
  t.deepEqual(cpeh, expectedCpeh)
})
