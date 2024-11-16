const express = require('express');
const { Pool } = require('pg'); // 引入 pg 模块
const bcrypt = require('bcrypt'); // 用于加密密码

const app = express();
const port = 3000;

// 使用你的数据库信息配置连接池
const pool = new Pool({
  user: 'postgres',         // 你的数据库用户名，默认为 postgres
  host: 'localhost',        // 数据库地址，WSL 默认本地是 localhost
  database: 'anime_sync',   // 你之前创建的数据库名称
  password: 'qaz098', // 设置的数据库用户密码
  port: 5432,               // PostgreSQL 默认端口
});

// 测试数据库连接的 API
app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(result.rows[0]);
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).send('Database connection error');
  }
});

// 默认的主页 API
app.get('/', (req, res) => {
  res.send('Hello, this is the Anime Sync Backend!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});