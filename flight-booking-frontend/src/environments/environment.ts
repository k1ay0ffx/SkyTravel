// ============================================================
//  BACKEND INTEGRATION GUIDE
//  1. Установи useMock: false
//  2. Измени apiUrl на адрес своего Django-сервера
//  3. npm start — всё заработает автоматически!
// ============================================================
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api/v1',
  useMock: false // <-- false когда бэк готов
};