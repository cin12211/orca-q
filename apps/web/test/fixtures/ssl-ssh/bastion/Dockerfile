# SSH bastion for the SSL+SSH fixture.
# Accepts BOTH password (tunnel/tunnel) and public-key auth, and allows
# TCP forwarding so OrcaQ's ssh2 tunnel can reach postgres:5432 / mysql:3306.
FROM alpine:3.20

RUN apk add --no-cache openssh-server bash \
  && ssh-keygen -A \
  && adduser -D -s /bin/bash tunnel \
  && echo 'tunnel:tunnel' | chpasswd \
  && mkdir -p /home/tunnel/.ssh \
  && chmod 700 /home/tunnel/.ssh

COPY authorized_keys /home/tunnel/.ssh/authorized_keys
COPY sshd_config /etc/ssh/sshd_config

RUN chown -R tunnel:tunnel /home/tunnel/.ssh \
  && chmod 600 /home/tunnel/.ssh/authorized_keys

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D", "-e"]
