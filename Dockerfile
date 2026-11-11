FROM node:26-alpine
WORKDIR /app
COPY package.json ./
COPY server.js safety.js checksums.sh ./
COPY public ./public
COPY docs ./docs
COPY kits ./kits
EXPOSE 7809
USER node
CMD ["node", "server.js"]
