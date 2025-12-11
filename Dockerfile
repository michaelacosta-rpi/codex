FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY index.html ./
COPY client.html ./
COPY runtime-config.js ./
COPY src ./src
COPY docs ./docs

COPY docker/entrypoint.sh /entrypoint.sh

ENV ADMIN_PORTAL_ORIGIN=http://admin

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
