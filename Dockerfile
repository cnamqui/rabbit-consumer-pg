FROM node:12.16.1-alpine3.9

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

RUN npm run build

# Bundle app source
COPY . .

ENV PORT=5000

EXPOSE 5000
CMD [ "node", "dist/server.js" ]