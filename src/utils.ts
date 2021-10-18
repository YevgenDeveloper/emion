import pstree from './pstree'
export function checkAndparseParametrizedString(
  check: string,
  stringToCheck: string
): null | any {
  const splits = check.toString().replace('/', '\/').split(/\${([^${}]*)}/gm)
  let regexStr = ''
  let isParameter = false
  const parameters = []
  for (const split of splits) {
    if (isParameter) {
      regexStr += '([^${}]*)'
      parameters.push(split)
    } else {
      regexStr += split
    }
    isParameter = !isParameter
  }
  const matches = new RegExp(regexStr, 'gm').exec(stringToCheck.toString())
  if (matches === null) {
    return null
  } else {
    const paramsVals = matches.slice(1)
    const rtrObj: any = {}
    for (let i = 0; i < parameters.length; i++) {
      rtrObj[parameters[i]] = paramsVals[i]
    }
    return rtrObj
  }
}
export function pickRandomColor(): string {
  const colors = [
    'black',
    'red',
    'green',
    'yellow',
    'blue',
    'magenta',
    'cyan',
    'white',
    'gray'
  ]
  const pickedColor = colors[Math.floor(Math.random() * colors.length)]
  return pickedColor
}
export function kill(pid: string, signal?: string, callback?: any) {
  signal = signal || 'SIGKILL'
  callback = callback || function() {}
  let killTree = true
  if (killTree) {
    const children: {}[] = pstree(pid)
    const childrenPids = children.map(function(p: any) {
      return p.PID
    })
    const pids = [pid, ...childrenPids]
    pids.forEach(function(tpid: string) {
      console.log('KILLING PROCESS', tpid)
      try {
        process.kill(Number(tpid), signal)
      } catch (ex) {}
    })
    callback()
  } else {
    console.log('KILLING PROCESS' + pid)
    try {
      process.kill(Number(pid), signal)
    } catch (ex) {}
    callback()
  }
}
