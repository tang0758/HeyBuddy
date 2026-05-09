#!/bin/bash

# 获取 Windows 宿主机的 IP 地址 (从 /etc/resolv.conf 中提取 nameserver)
HOST_IP=$(grep nameserver /etc/resolv.conf | awk '{print $2}')

# 如果上面的方法失效，备选方案：通过 ip route 获取
if [ -z "$HOST_IP" ]; then
    HOST_IP=$(ip route | grep default | awk '{print $3}')
fi

# 设置代理端口 (根据您的 Clsh/V2Ray 默认端口修改，您之前给的是 7890)
PROXY_PORT=7890

if [ -n "$HOST_IP" ]; then
    export http_proxy="http://${HOST_IP}:${PROXY_PORT}"
    export https_proxy="http://${HOST_IP}:${PROXY_PORT}"
    export ALL_PROXY="socks5://${HOST_IP}:${PROXY_PORT}"
    
    echo "✅ Proxy set to Windows Host: ${HOST_IP}:${PROXY_PORT}"
    echo "http_proxy=$http_proxy"
    echo "https_proxy=$https_proxy"
else
    echo "❌ Error: Could not detect Windows Host IP."
fi
