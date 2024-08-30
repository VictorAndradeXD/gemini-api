import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./data/database.sqlite', (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    endereco TEXT NOT NULL,
    codigo_cliente TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('Erro ao criar a tabela clientes:', err.message);
  } else {
    console.log('Tabela clientes criada ou já existe.');
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS leituras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    tipo_leitura TEXT NOT NULL CHECK (tipo_leitura IN ('WATER', 'GAS')),
    valor_leitura REAL NOT NULL,
    data_leitura DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
  )
`, (err) => {
  if (err) {
    console.error('Erro ao criar a tabela leituras:', err.message);
  } else {
    console.log('Tabela leituras criada ou já existe.');
  }
});

db.close((err) => {
  if (err) {
    console.error('Erro ao fechar a conexão com o banco de dados:', err.message);
  } else {
    console.log('Conexão com o banco de dados SQLite fechada.');
  }
});
