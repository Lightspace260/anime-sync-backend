const express = require('express');
const { Pool } = require('pg'); // 引入 pg 模块
const bcrypt = require('bcrypt'); // 用于加密密码

const app = express();
const port = 4000;

const jwt = require('jsonwebtoken');
const secretKey = 'qazplm098123'; // 请使用一个复杂且难以猜测的密钥

const multer = require('multer');
const path = require('path');

const fs = require('fs');


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

// JWT 验证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // 令牌在 "Bearer <token>" 中

  if (!token) {
    return res.status(401).send('Access denied. No token provided.');
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).send('Invalid token.');
    }

    req.user = user; // 将用户信息附加到请求对象中
    next(); // 继续处理请求
  });
}


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

// 用户登录 API
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // 检查用户名和密码是否存在
  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  try {
    // 从数据库中查找用户
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(400).send('Invalid username or password.');
    }

    const user = result.rows[0];

    // 验证密码
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).send('Invalid username or password.');
    }

    // 生成 JWT 令牌
    const token = jwt.sign({ userId: user.id, username: user.username }, secretKey, { expiresIn: '1h' });

    res.status(200).send({ message: 'Login successful!', token });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).send('Server error.');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// 保存或更新观看进度 API (受保护)
app.post('/progress', authenticateToken, async (req, res) => {
  const { animeTitle, episode, progressTime } = req.body;

  if (!animeTitle || !episode) {
    return res.status(400).send('Anime title and episode are required.');
  }

  try {
    const userId = req.user.userId;

    // 检查是否已有该动漫的进度记录
    const progressResult = await pool.query(
      'SELECT * FROM watch_progress WHERE user_id = $1 AND anime_title = $2 AND episode = $3',
      [userId, animeTitle, episode]
    );

    if (progressResult.rows.length > 0) {
      // 更新已有记录
      await pool.query(
        'UPDATE watch_progress SET progress_time = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND anime_title = $3 AND episode = $4',
        [progressTime, userId, animeTitle, episode]
      );
      res.status(200).send('Progress updated successfully!');
    } else {
      // 插入新记录
      await pool.query(
        'INSERT INTO watch_progress (user_id, anime_title, episode, progress_time) VALUES ($1, $2, $3, $4)',
        [userId, animeTitle, episode, progressTime]
      );
      res.status(201).send('Progress saved successfully!');
    }
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).send('Server error.');
  }
});    //存在问题，无法接收

// 保存或更新观看进度 API (受保护)
app.post('/progress', authenticateToken, async (req, res) => {
  const { animeId, episode, progressTime } = req.body;

  if (!animeId || !episode) {
    return res.status(400).send('Anime ID and episode are required.');
  }

  try {
    const userId = req.user.userId;

    // 检查是否已有该动漫的进度记录
    const progressResult = await pool.query(
      'SELECT * FROM watch_progress WHERE user_id = $1 AND anime_id = $2 AND episode = $3',
      [userId, animeId, episode]
    );

    if (progressResult.rows.length > 0) {
      // 更新已有记录
      await pool.query(
        'UPDATE watch_progress SET progress_time = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND anime_id = $3 AND episode = $4',
        [progressTime, userId, animeId, episode]
      );
      res.status(200).send('Progress updated successfully!');
    } else {
      // 插入新记录
      await pool.query(
        'INSERT INTO watch_progress (user_id, anime_id, episode, progress_time) VALUES ($1, $2, $3, $4)',
        [userId, animeId, episode, progressTime]
      );
      res.status(201).send('Progress saved successfully!');
    }
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).send('Server error.');
  }
});

// 查看用户观看进度 API (受保护)
app.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 查询用户的观看进度
    const progressResult = await pool.query(
      `SELECT wp.anime_id, a.title AS anime_title, wp.episode, wp.progress_time, wp.updated_at
       FROM watch_progress wp
       JOIN anime a ON wp.anime_id = a.id
       WHERE wp.user_id = $1`,
      [userId]
    );

    res.status(200).json(progressResult.rows);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).send('Server error.');
  }
});


// 添加动漫信息 API (管理员操作)
app.post('/anime', authenticateToken, async (req, res) => {
  const { title, description, episodes } = req.body;

  if (!title || !episodes) {
    return res.status(400).send('Title and number of episodes are required.');
  }

  try {
    // 插入新动漫信息到数据库
    const result = await pool.query(
      'INSERT INTO anime (title, description, episodes) VALUES ($1, $2, $3) RETURNING id',
      [title, description, episodes]
    );

    res.status(201).send({ animeId: result.rows[0].id, message: 'Anime added successfully!' });
  } catch (error) {
    console.error('Error adding anime:', error);
    res.status(500).send('Server error.');
  }
});

// 获取所有动漫信息 API
app.get('/anime', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM anime');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching anime:', error);
    res.status(500).send('Server error.');
  }
});

// 获取特定动漫信息 API
app.get('/anime/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM anime WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Anime not found.');
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching anime:', error);
    res.status(500).send('Server error.');
  }
});

// 配置 multer 存储位置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // 上传文件存储目录
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // 生成唯一文件名
  },
});

const upload = multer({ storage: storage });

// 视频文件上传 API
app.post('/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    // 成功上传
    res.status(201).send({ message: 'File uploaded successfully', filename: req.file.filename });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('Server error.');
  }
});

app.get('/video/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'uploads', filename);

  // 检查文件是否存在
  if (!fs.existsSync(filepath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(filepath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // 解析 Range 请求
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
      return;
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(filepath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    // 如果没有 Range 请求，返回整个文件
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(filepath).pipe(res);
  }
});