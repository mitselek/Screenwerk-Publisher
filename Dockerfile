FROM node:6-slim

ADD ./ /usr/src/swpublisher
RUN cd /usr/src/swpublisher && npm --silent --production install

CMD ["node", "/usr/src/swpublisher/master.js"]
