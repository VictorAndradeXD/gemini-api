FROM node:22.6.0-alpine

RUN apk add --no-cache sqlite

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npx", "ts-node", "src/index.ts"]
