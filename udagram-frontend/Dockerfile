### Build
FROM node:16.20.0 as build
# FROM beevelop/ionic:latest AS ionic
## Create app directory
WORKDIR /usr/src/app
## Install app dependencies
## A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY udagram-frontend/package*.json ./
RUN npm i -f
RUN npm install -g @ionic/cli
## Bundle app source
COPY udagram-frontend/. .
RUN ionic build
### Run 
FROM nginx:alpine
#COPY www /usr/share/nginx/html
COPY --from=build  /usr/src/app/www /usr/share/nginx/html