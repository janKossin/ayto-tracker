FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# Copy prisma directory for generation
COPY prisma ./prisma/

RUN apk -U add --no-cache openssl
RUN npm ci

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
