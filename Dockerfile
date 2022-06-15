FROM node:18
RUN mkdir -p /code
WORKDIR /code
ADD . /code

ENV NODE_OPTIONS=--openssl-legacy-provider
RUN yarn 
RUN npm run compile
CMD [ "npx", "hardhat", "deploy" ]

CMD [ "npx", "hardhat", "node", "--hostname", "0.0.0.0" ]
