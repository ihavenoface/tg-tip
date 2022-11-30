FROM node:18-alpine
#ENV USER_ID=1000
#ENV GROUP_ID=1000
#ENV USER_NAME=host-user
#ENV GROUP_NAME=host-user

RUN apk add git python3 alpine-sdk zeromq-dev
WORKDIR /app
#RUN addgroup -g $GROUP_ID $GROUP_NAME && \
#    adduser --shell /sbin/nologin --disabled-password \
#    --no-create-home --uid $USER_ID --ingroup $GROUP_NAME $USER_NAME

# node just happens to be in the default 1000 group, which is very convenient
USER node
