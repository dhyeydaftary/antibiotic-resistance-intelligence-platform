# Node base matches the version CI tests against (.github/workflows/ci.yml's
# gateway job: node-version '22').
FROM node:22-alpine

WORKDIR /app

# package-lock.json copied alongside package.json so `npm ci` (not `npm
# install`) can do a reproducible, lockfile-exact install — and so this
# layer stays cached across code-only changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# PORT defaults to 5000 (index.js: `process.env.PORT || 5000`) — matches
# gateway/.env.example. Actual runtime port still follows whatever PORT is
# set to via docker-compose's env_file; EXPOSE here just documents the
# default for anyone reading this file.
EXPOSE 5000

CMD ["npm", "start"]
