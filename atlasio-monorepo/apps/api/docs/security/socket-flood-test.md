# Whiteboard/Live Flood Test & Rate Limit Tuning

## Amaç
Socket (whiteboard/live) trafiğinde flood/DoS denemelerini tespit etmek ve rate-limit ayarlarını doğrulamak.

## Hazırlık
- API: http://localhost:4000
- Namespace: /whiteboard (Socket.IO)
- Rate limit: gateway şu an 10 event/sn per socket (whiteboard.gateway.ts), payload limit 32KB.

## Test Senaryoları
1) **Normal kullanıcı**
   - 1 event/sn, 1 dk süre → engel yok.
2) **Flood**
   - 20 event/sn, 5 sn → “forbidden: rate-limit” beklenir, socket bağlantısı açık kalır.
3) **Büyük payload**
   - 40KB payload ile action → “payload-too-large”.
4) **Auth fail**
   - Geçersiz/boş JWT ile join/action → “forbidden: auth” ve disconnect.

## Araç (basit Node flooder)
```bash
npm install socket.io-client
node scripts/socket-flood.js
```

`scripts/socket-flood.js` içeriği:
```js
const { io } = require('socket.io-client');
const API = process.env.API || 'http://localhost:4000';
const token = process.env.JWT || '';
const sessionId = process.env.WB_SESSION || 'demo';
const socket = io(`${API}/whiteboard`, { auth: { token } });

socket.on('connect', () => {
  socket.emit('join', { sessionId });
  let sent = 0;
  const timer = setInterval(() => {
    sent += 1;
    socket.emit('action', { sessionId, payload: { n: sent } });
    if (sent > 25) clearInterval(timer);
  }, 50); // 20 msg/sn
});

socket.on('forbidden', (m) => console.log('forbidden', m));
socket.on('disconnect', (r) => console.log('disc', r));
```

## Ayar Tuning Önerisi
- `rateLimit` eşiğini 10→5 msg/sn yapmak için: whiteboard.gateway.ts içinde `bucket.count > 10` eşiğini 5’e indir.
- Canlıda IP başına da rate limit eklemek için gateway veya reverse proxy’de IP-based throttle ekleyin.

## Beklenen Sonuç
- Flood testi sırasında “forbidden: rate-limit” görülür, servis stabil kalır.
- Büyük payload denemesinde “payload-too-large” döner.
- Geçersiz JWT’de anında disconnect.
