const net = require('net')
const socks = require('socksv5')
const http = require('http')

// Socks5服务器
const socks5Server = socks.createServer((info, accept) => {
  accept()
})
socks5Server.listen(1072, '0.0.0.0', () => {
  console.log('Socks5服务器 LISTEN 1072')
})
socks5Server.useAuth(socks.auth.None())

// HTTP服务端
const clientMap = new Map()
const httpServer = http.createServer((req, res) => {
  let data = ''
  req.on('data', (chunk) => {
    data += chunk
  })
  req.on('end', () => {
    // 解析数据：[ip, port, type, data]
    let json
    try {
      json = atob(JSON.parse(data)[0].replace('@', '=').split('').reverse().join('')).split('$$$$$$')
    } catch (e) {
      // nothing
    }
    if (!Array.isArray(json) || json.length < 3) {
      res.end('no')
      return
    }
    const clientKey = json[0] + ':' + json[1]
    let client = clientMap.get(clientKey)
    if (!client) {
      client = {
        isConnected: false,
        ins: new net.Socket(),
        data: [],
      }
      // client.ins.setKeepAlive(false)
      client.ins
        .on('ready', () => {
          client.isConnected = true
        })
        .on('data', (data) => {
          client.data.push(data.toString('base64'))
        })
        .on('error', () => {
          client.ins = null
        })
        .on('close', () => {
          client.ins = null
        })
        .connect(1072, '127.0.0.1')
      clientMap.set(clientKey, client)
    }

    if (json[2] === 'send') {
      const buffer = Buffer.from(json[3], 'base64')
      waitWrite(client, buffer)
      res.end('')
    } else if (json[2] === 'pull') {
      const dstQuene1 = client.data
      client.data = []
      res.end(dstQuene1.join('@@@@@@'))
    } else {
      res.end('')
    }
  })
  const waitWrite = (client, buffer) => {
    if (!client.ins) return
    if (client.isConnected) {
      client.ins.write(buffer)
    } else {
      setTimeout(() => waitWrite(client, buffer), 10)
    }
  }
})
httpServer.listen(1071, '0.0.0.0', () => {
  console.log('HTTP服务端 LISTEN 1071')
})
