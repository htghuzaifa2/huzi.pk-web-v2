#!/bin/bash
python3 -c "
import paramiko, sys, os
key = paramiko.Ed25519Key.from_private_key_file('/home/z/my-project/huzi-pk-web/deploy_key')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(sys.argv[1], port=int(sys.argv[2]) if len(sys.argv) > 2 else 22, username='git', pkey=key)
chan = client.get_transport().open_session()
chan.exec_command(' '.join(sys.argv[3:]))
import select
while True:
    if chan.recv_ready():
        sys.stdout.buffer.write(chan.recv(4096))
        sys.stdout.buffer.flush()
    if chan.exit_status_ready():
        break
sys.exit(chan.recv_exit_status())
" "$@"
