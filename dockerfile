# 使用官方 Node.js 镜像作为基础镜像
FROM node:16

# 设置工作目录
WORKDIR /app

# 将 package.json 和 package-lock.json 复制到工作目录中
COPY package*.json ./

# 安装所有依赖
RUN npm install

# 将当前目录下的所有文件复制到工作目录中
COPY . .

# 暴露应用使用的端口
EXPOSE 4000

# 启动应用
CMD ["npm", "start"]
