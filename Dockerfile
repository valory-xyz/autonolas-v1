FROM node:18.3.0 as builder
RUN mkdir -p /code
WORKDIR /code
ADD package* /code

ENV NODE_OPTIONS=--openssl-legacy-provider
RUN yarn install --ignore-engines 

COPY contracts contracts
COPY scripts scripts
COPY lib lib
COPY deploy deploy
COPY hardhat.config.js .

RUN npm run compile
RUN npx hardhat deploy

CMD [ "npx", "hardhat", "node", "--hostname", "0.0.0.0" ]
