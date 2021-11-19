'use strict'
import child_process from 'child_process'
const spawn = child_process.spawnSync
export default function childrenOfPid(
  pid: string | number): Array<{}> {
  try {
    let headers: any[]
    if (typeof pid === 'number') {
      pid = pid.toString()
    }
    let processes
    if (process.platform === 'win32') {
      processes = spawn('wmic.exe', [
        'PROCESS',
        'GET',
        'Name,ProcessId,ParentProcessId,Status'
      ]).output.toString()
    } else {
      processes = spawn('ps', [
        '-A',
        '-o',
        'ppid,pid,stat,comm'
      ]).output.toString()
    }
    processes = processes.substring(2).split('\n').map(line => {
      var columns = line
        .toString()
        .trim()
        .split(/\s+/)
      try {
        if (!headers) {
          headers = columns
          headers = headers.map(normalizeHeader)
        }
        var row: any = {}
        var h = headers.slice()
        while (h.length) {
          row[h.shift()] = h.length ? columns.shift() : columns.join(' ')
        }
        return row
      } catch (e) {
        console.log(e)
      }
    })
    let parents: any = {}
    let children: any[] = []
    parents[pid] = true
    processes.forEach(function(proc: any) {
      if (parents[proc.PPID]) {
        parents[proc.PID] = true
        children.push(proc)
      }
    })
    return children
  } catch (e) {
    return []
  }
}
function normalizeHeader(str: string) {
  if (process.platform !== 'win32') {
    return str
  }
  switch (str) {
    case 'Name':
      return 'COMMAND'
    case 'ParentProcessId':
      return 'PPID'
    case 'ProcessId':
      return 'PID'
    case 'Status':
      return 'STAT'
    default:
      throw new Error('Unknown process listing header: ' + str)
  }
}
