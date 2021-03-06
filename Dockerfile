FROM alpine:3.6

LABEL maintainer="Andrei Varabyeu <andrei_varabyeu@epam.com>"
LABEL version=3.2.4

ENV APP_DOWNLOAD_URL https://dl.bintray.com/epam/reportportal/3.2.4

ADD ${APP_DOWNLOAD_URL}/service-ui_linux_amd64 /service-ui
ADD ${APP_DOWNLOAD_URL}/ui.tar.gz /

RUN chmod +x /service-ui
RUN tar -zxvf ui.tar.gz -C / && rm -f ui.tar.gz

ENV RP_STATICSPATH=/public


EXPOSE 8080
ENTRYPOINT ["/service-ui"]
