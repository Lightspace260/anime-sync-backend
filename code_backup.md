---2024/11/17-完成注册部分，登录部分缺失---
const express = require('express');
const { Pool } = require('pg'); // 引入 pg 模块
const bcrypt = require('bcrypt'); // 用于加密密码

const app = express();
const port = 4000;

// 使用你的数据库信息配置连接池
const pool = new Pool({
  user: 'postgres',         // 你的数据库用户名，默认为 postgres
  host: 'localhost',        // 数据库地址，WSL 默认本地是 localhost
  database: 'anime_sync',   // 你之前创建的数据库名称
  password: 'qaz098',       // 设置的数据库用户密码
  port: 5432,               // PostgreSQL 默认端口
});

// 中间件 - 用于解析传入的 JSON 数据
app.use(express.json());

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

// 用户注册 API
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // 检查用户名和密码是否存在
  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  try {
    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入新用户到数据库
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
      [username, hashedPassword]
    );

    res.status(201).send({ userId: result.rows[0].id, message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error registering user:', error);
    if (error.code === '23505') { // PostgreSQL 的唯一约束错误码
      res.status(409).send('Username already exists.');
    } else {
      res.status(500).send('Server error.');
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

-----------------------

