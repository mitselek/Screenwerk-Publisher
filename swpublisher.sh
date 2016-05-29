#!/bin/bash

mkdir -p /data/swpublisher/code /data/swpublisher/log /data/swpublisher/screens
cd /data/swpublisher/code

git clone -q https://github.com/mitselek/Screenwerk-Publisher.git ./
git checkout -q master
git pull

printf "\n\n"
version=`date +"%y%m%d.%H%M%S"`
docker build --quiet --pull --tag=swpublisher:$version ./ && docker tag swpublisher:$version swpublisher:latest

printf "\n\n"
docker stop swpublisher
docker rm swpublisher
docker run -d \
    --net="entu" \
    --name="swpublisher" \
    --restart="always" \
    --cpu-shares=256 \
    --memory="250m" \
    --env="NODE_ENV=production" \
    --env="VERSION=$version" \
    --env="PORT=80" \
    --env="COOKIE_SECRET=" \
    --env="DEPLOYMENT=debug" \
    --env="NEW_RELIC_APP_NAME=swpublisher" \
    --env="NEW_RELIC_LICENSE_KEY=" \
    --env="NEW_RELIC_LOG=stdout" \
    --env="NEW_RELIC_LOG_LEVEL=error" \
    --env="NEW_RELIC_NO_CONFIG_FILE=true" \
    --env="ENTU_USER=" \
    --env="ENTU_KEY=" \
    --env="SENTRY_DSN=" \
    --volume="/data/swpublisher/log:/usr/src/swpublisher/log" \
    --volume="/data/swpublisher/screens:/usr/src/swpublisher/screens" \
    swpublisher:latest

printf "\n\n"
docker exec nginx /etc/init.d/nginx reload
