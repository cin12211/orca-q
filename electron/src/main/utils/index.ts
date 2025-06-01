import net from 'net'

function getRandomPort(min = 1024, max = 65535) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function findAvailablePort(preferredPort = 5555): Promise<number> {
  function checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const tester = net
        .createServer()
        .once('error', () => resolve(false))
        .once('listening', () => {
          tester.close(() => resolve(true))
        })
        .listen(port)
    })
  }

  if (await checkPort(preferredPort)) return preferredPort

  let port: number
  do {
    port = getRandomPort()
  } while (!(await checkPort(port)))
  return port
}
