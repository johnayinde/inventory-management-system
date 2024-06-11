FROM node:18-alpine

ENV APP_HOME /home/app/

WORKDIR $APP_HOME



COPY . $APP_HOME

RUN yarn install
