const net = require('net')
const request = require('request')

const httpTarget = 'http://127.0.0.1:1071'

const socks5Server = net.createServer((sock) => {
  // 定时拉取
  let sockIsAlive = true
  let receivedAt = Date.now()
  const pull = () => {
    request.post(
      {
        url: httpTarget + '/api/products/' + Date.now(),
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          btoa([sock.remoteAddress, sock.remotePort, 'pull', ''].join('$$$$$$').toString('base64'))
            .split('')
            .reverse()
            .join('')
            .replace('==', '@'),
        ]),
      },
      (err, rep, body) => {
        const dstQuene = (err ? [] : body.split('@@@@@@')).filter((v) => v !== '').map((v) => Buffer.from(v, 'base64'))
        if (dstQuene.length) {
          receivedAt = Date.now()
        }
        dstQuene.map((v) => {
          if (sock.writable) {
            sock.write(v)
          } else {
            sockIsAlive = false
          }
        })
        if (sockIsAlive) {
          const diff = Date.now() - receivedAt
          setTimeout(pull, diff < 1000 ? 200 : diff * 3)
        }
      }
    )
  }
  pull()

  sock.on('data', (data) => {
    request.post({
      url: httpTarget + '/api/products/' + Date.now(),
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        btoa([sock.remoteAddress, sock.remotePort, 'send', data.toString('base64')].join('$$$$$$').toString('base64'))
          .split('')
          .reverse()
          .join('')
          .replace('==', '@'),
      ]),
    })

    receivedAt = Date.now()
  })
})
socks5Server.listen(1070, '0.0.0.0', () => {
  console.log('本地Socks5转发 LISTEN 1070')
})
