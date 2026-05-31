# Imagem Base
FROM node:20

# Diretório dentro do container
WORKDIR /app

# Copia package.json primeiro (cache inteligente)
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia o resto do projeto
COPY . .

# Porta da aplicação
EXPOSE 3000

# Comando para rodar
CMD ["node", "src/server.js"]