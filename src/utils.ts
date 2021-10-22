import pstree from './pstree'
export function checkAndparseParametrizedString(
  check: string,
  stringToCheck: string
): null | any {
  const splits = check
    .toString()
    .replace('/', '/')
    .split(/\${([^${}]*)}/gm)
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
let currentIndex = 0
export function pickRandomColor(): string {
  const colors = [
    'red',
    'green',
    'yellow',
    'blue',
    'magenta',
    'black',
    'cyan',
    'white',
    'gray'
  ]
  const pickedColor = colors[currentIndex]
  currentIndex++
  if (currentIndex > colors.length - 1) {
    currentIndex = 0
  }
  return pickedColor
}
export function kill(v: Vorpal, pid: string, signal?: string, callback?: any) {
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
      v.log('Killing process ', tpid)
      try {
        process.kill(Number(tpid), signal)
      } catch (ex) {}
    })
    callback()
  } else {
    v.log('Killing process ', pid)
    try {
      process.kill(Number(pid), signal)
    } catch (ex) {}
    callback()
  }
}
export  function getEnvLoggerForEnvironement(vorpal: Vorpal) {
  return async (inputs: { envName: string, color: string|undefined, data: any }) => {
    const { envName, color, data } = inputs
    if (data) {
      const dataToPrint = data.toString().trim()
      if (dataToPrint) {
        const chunks = dataToPrint.split('\n')
        for (const chunk of chunks) {
          vorpal.log(
            vorpal.chalk[color||'white'](`[${envName.padEnd(6, ' ')}] ${chunk}`)
          )
        }
      }
    }
  }
}
