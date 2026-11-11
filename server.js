// Модули сервера и файлов
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Порт и пути
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'requests.json');
// Типы файлов
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// Ответ в JSON
function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

// Создание сервера
const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  // Приём заявок
  if (request.method === 'POST' && url.pathname === '/api/requests') {
    let body = '';
    // Чтение данных формы
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 20_000) request.destroy();
    });
    // Обработка полученных данных
    request.on('end', () => {
      // Проверка JSON
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return sendJson(response, 400, { error: 'Veidlapas dati nav derīgi.' });
      }

      // Проверка контактов
      const name = String(data.name || '').trim();
      const email = String(data.email || '').trim();
      if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
        return sendJson(response, 400, { error: 'Pārbaudi vārdu un e-pasta adresi.' });
      }

      // Запись заявки
      const entry = {
        id: Date.now().toString(36),
        name,
        email,
        period: String(data.period || '').slice(0, 100),
        interests: String(data.interests || '').trim().slice(0, 1000),
        createdAt: new Date().toISOString(),
      };

      // Сохранение заявки
      fs.readFile(DATA_FILE, 'utf8', (readError, contents) => {
        let requests = [];
        if (!readError) {
          try { requests = JSON.parse(contents); } catch { requests = []; }
        }
        requests.push(entry);
        fs.writeFile(DATA_FILE, JSON.stringify(requests, null, 2), 'utf8', (writeError) => {
          if (writeError) return sendJson(response, 500, { error: 'Pieteikumu neizdevās saglabāt.' });
          sendJson(response, 201, { ok: true, id: entry.id });
        });
      });
    });
    return;
  }

  // Запрос файлов сайта
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return sendJson(response, 405, { error: 'Šī pieprasījuma metode nav atbalstīta.' });
  }

  // Проверка пути к файлу
  const pathname = decodeURIComponent(url.pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(ROOT, relativePath);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    response.writeHead(403);
    return response.end('Aizliegts');
  }

  // Отправка файла
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end(error.code === 'ENOENT' ? 'Lapa nav atrasta' : 'Servera kļūda');
    }
    response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : content);
  });
});

// Запуск сервера
server.listen(PORT, () => console.log(`prakse 11.11.2026 darbojas: http://localhost:${PORT}`));