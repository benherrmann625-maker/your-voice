FROM node:20-alpine
WORKDIR /srv
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 4100
CMD ["npm", "run", "start"]
