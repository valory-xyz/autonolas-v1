FROM node:18.3.0
RUN mkdir -p /code
WORKDIR /code
ADD . /code

ENV NODE_OPTIONS=--openssl-legacy-provider
RUN yarn install --ignore-engines 
RUN npm run compile

CMD [ "npx", "hardhat", "node", "--hostname", "0.0.0.0" ]
