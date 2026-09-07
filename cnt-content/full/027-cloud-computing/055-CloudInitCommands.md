---
order: 550
title: cloud-init 云实例初始化
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: cloud-init 云实例初始化 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## cloud-init 基础

**基本写法：查看版本**
`cloud-init --version`
```bash
# 查看 cloud-init 版本
cloud-init --version
```

---

**基本写法：查看 cloud-init 状态**
`cloud-init status`
```bash
# 查看实例初始化状态
cloud-init status
```

---

**基本写法：等待完成**
`cloud-init status --wait`
```bash
# 阻塞等待 cloud-init 完成
cloud-init status --wait
```

---

**基本写法：查看详细状态**
`cloud-init status --long`
```bash
# 显示详细 cloud-init 状态与错误信息
cloud-init status --long
```

---

**基本写法：查看 cloud-init 文档**
`cloud-init --help`
```bash
# 查看所有可用子命令
cloud-init --help
```

---

## 用户数据配置

**基本写法：使用 cloud-config 格式**
```yaml
# user-data.yaml 用户数据脚本
#cloud-config
hostname: web-server
manage_etc_hosts: true
```

---

**基本写法：使用 shell 脚本**
```bash
#!/bin/bash
# user-data.sh 通过 shell 脚本初始化
set -e
apt-get update
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
```

---

**基本写法：包含文件**
```yaml
# 写入文件到实例
#cloud-config
write_files:
  - path: /etc/myapp/config.yaml
    content: |
      server:
        port: 8080
        host: 0.0.0.0
    owner: root:root
    permissions: '0644'
```

---

**基本写法：从 URL 下载文件**
```yaml
# 从远程 URL 下载配置文件
#cloud-config
write_files:
  - path: /etc/nginx/conf.d/default.conf
    encoding: b64
    content: <Base64 编码内容>
    defer: true
```

---

**基本写法：追加到文件**
```yaml
# 追加内容到已有文件
#cloud-config
write_files:
  - path: /etc/hosts
    content: |
      10.0.0.5  db.internal
      10.0.0.6  cache.internal
    append: true
```

---

## 软件包管理

**基本写法：更新软件包**
```yaml
#cloud-config
package_update: true
package_upgrade: true
package_reboot_if_required: true
```

---

**基本写法：安装软件包**
```yaml
#cloud-config
packages:
  - nginx
  - git
  - htop
  - curl
package_update: true
```

---

**基本写法：指定软件源**
```yaml
#cloud-config
apt:
  sources:
    docker.list:
      source: "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
      keyid: 9DC858229FC7DD38854AE2D88D81803C0EBFCD88
```

---

**基本写法：安装指定版本**
```yaml
#cloud-config
packages:
  - [nginx, 1.18.0-0ubuntu1]
package_update: true
```

---

**基本写法：安装 Snap 包**
```yaml
#cloud-config
snap:
  commands:
    - snap install --classic code
    - snap install go --channel 1.22/stable --classic
```

---

## 用户与组管理

**基本写法：创建用户**
```yaml
#cloud-config
users:
  - name: deploy
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: sudo, docker
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2E... user@example.com
```

---

**基本写法：默认用户配置 SSH key**
```yaml
#cloud-config
ssh_authorized_keys:
  - ssh-rsa AAAAB3NzaC1yc2E... admin@example.com
  - ssh-ed25519 AAAAC3NzaC1lZDI1... deploy@example.com
```

---

**基本写法：禁用密码登录**
```yaml
#cloud-config
ssh_pwauth: false
disable_root: true
```

---

**基本写法：设置用户密码**
```yaml
#cloud-config
chpasswd:
  list: |
    deploy:MyStrongPass123!
  expire: false
```

---

**基本写法：移除默认用户**
```yaml
#cloud-config
users:
  - default
  - name: myuser
    groups: sudo
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    lock_passwd: false
```

---

## 命令执行

**基本写法：运行命令**
```yaml
#cloud-config
runcmd:
  - mkdir -p /data/app
  - chown -R deploy:deploy /data
  - systemctl restart nginx
```

---

**基本写法：执行多行脚本**
```yaml
#cloud-config
runcmd:
  - |
    #!/bin/bash
    set -e
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
```

---

**基本写法：bootcmd 启动命令**
```yaml
#cloud-config
bootcmd:
  - echo "Boot at $(date)" >> /var/log/boot.log
  - mkdir -p /mnt/data
```

---

**基本写法：使用模块顺序**
```yaml
#cloud-config
cloud_final_modules:
  - package-update-upgrade-install
  - puppet
  - chef
  - mcollective
  - salt-minion
  - reset_rmc
  - refresh_rmc_and_interface
  - rightscale_userdata
  - scripts-vendor
  - scripts-per-once
  - scripts-per-boot
  - scripts-per-instance
  - scripts-user
  - ssh-authkey-fingerprints
  - keys-to-console
  - install-hotplug
  - phone-home
  - final-message
  - power-state-change
```

---

## 磁盘与挂载

**基本写法：挂载磁盘**
```yaml
#cloud-config
mounts:
  - [ /dev/vdb, /data, ext4, "defaults,noatime", "0", "2" ]
  - [ /dev/vdc, /backup, xfs, "defaults", "0", "0" ]
```

---

**基本写法：格式化磁盘**
```yaml
#cloud-config
disk_setup:
  /dev/vdb:
    table_type: gpt
    layout: true
    overwrite: false
fs_setup:
  - device: /dev/vdb
    filesystem: ext4
    label: data
```

---

**基本写法：创建 RAID**
```yaml
#cloud-config
disk_setup:
  md0:
    table_type: mbr
    layout: [ /dev/vdb, /dev/vdc ]
    overwrite: true
raidd:
  md0:
    devices:
      - /dev/vdb
      - /dev/vdc
    level: 1
    metadata: 1.2
    name: md0
```

---

**基本写法：调整 LVM**
```yaml
#cloud-config
lvm:
  lvmdisk:
    type: lvm
    devices:
      - /dev/vdb
  lvms:
    - name: data
      vg: lvmdisk
      size: 100G
```

---

**基本写法：fstab 配置**
```yaml
#cloud-config
mounts:
  - [ /dev/vdb, /data, ext4, "defaults,noatime,nofail", "0", "2" ]
  - [ /dev/vdc, /logs, xfs, "defaults,nofail", "0", "0" ]
  - [ tmpfs, /tmp, tmpfs, "defaults,size=2G", "0", "0" ]
```

---

## 网络配置

**基本写法：配置静态 IP**
```yaml
#cloud-config
version: 2
ethernets:
  eth0:
    addresses:
      - 10.0.1.100/24
    gateway4: 10.0.1.1
    nameservers:
      addresses: [8.8.8.8, 1.1.1.1]
    routes:
      - to: 10.0.0.0/16
        via: 10.0.1.1
```

---

**基本写法：配置 DHCP**
```yaml
#cloud-config
version: 2
ethernets:
  eth0:
    dhcp4: true
    dhcp6: true
```

---

**基本写法：多网卡配置**
```yaml
#cloud-config
version: 2
ethernets:
  eth0:
    addresses: [10.0.1.100/24]
    gateway4: 10.0.1.1
  eth1:
    addresses: [192.168.1.50/24]
    routes:
      - to: 192.168.0.0/16
        via: 192.168.1.1
```

---

**基本写法：配置 Bonding**
```yaml
#cloud-config
version: 2
bonds:
  bond0:
    interfaces: [eth0, eth1]
    parameters:
      mode: 802.3ad
      lacp-rate: fast
      transmit-hash-policy: layer3+4
    addresses: [10.0.1.100/24]
    gateway4: 10.0.1.1
```

---

**基本写法：配置 VLAN**
```yaml
#cloud-config
version: 2
vlans:
  vlan100:
    id: 100
    link: eth0
    addresses: [10.100.0.10/24]
  vlan200:
    id: 200
    link: eth0
    addresses: [10.200.0.10/24]
```

---

## 服务管理

**基本写法：启用服务**
```yaml
#cloud-config
runcmd:
  - systemctl enable nginx
  - systemctl enable docker
  - systemctl enable redis
```

---

**基本写法：自定义服务**
```yaml
#cloud-config
write_files:
  - path: /etc/systemd/system/myapp.service
    content: |
      [Unit]
      Description=My Application
      After=network.target
      [Service]
      Type=simple
      User=deploy
      ExecStart=/opt/myapp/app
      Restart=always
      [Install]
      WantedBy=multi-user.target
runcmd:
  - systemctl daemon-reload
  - systemctl enable myapp
  - systemctl start myapp
```

---

**基本写法：启动时延迟启动**
```yaml
#cloud-config
bootcmd:
  - sleep 30 && systemctl restart myapp &
```

---

## 模块与日志

**基本写法：查看日志**
`sudo cat /var/log/cloud-init.log`
```bash
# 查看 cloud-init 详细日志
sudo cat /var/log/cloud-init.log | less
```

---

**基本写法：查看输出日志**
`sudo cat /var/log/cloud-init-output.log`
```bash
# 查看 cloud-init 执行输出
sudo tail -n 100 /var/log/cloud-init-output.log
```

---

**基本写法：清理 cloud-init 状态**
`sudo cloud-init clean`
```bash
# 清理 cloud-init 状态便于重新运行
sudo cloud-init clean
```

---

**基本写法：清理并重启**
`sudo cloud-init clean --logs --reboot`
```bash
# 清理日志并重启重新初始化
sudo cloud-init clean --logs --reboot
```

---

**基本写法：单模块运行**
`sudo cloud-init modules --mode=<模式> [--name=<模块>]`
```bash
# 单独运行指定模块
sudo cloud-init modules --mode=final --name=final-message
```

---

## 调试与分析

**基本写法：查询实例元数据**
`curl http://169.254.169.254/latest/meta-data/`
```bash
# 查询 AWS EC2 元数据
curl -s http://169.254.169.254/latest/meta-data/instance-id
```

---

**基本写法：查询用户数据**
`curl http://169.254.169.254/latest/user-data`
```bash
# 查看实例启动时传入的用户数据
curl -s http://169.254.169.254/latest/user-data
```

---

**基本写法：分析 cloud-init 阶段**
`cloud-init analyze show`
```bash
# 显示各阶段耗时
cloud-init analyze show -i /var/log/cloud-init.log
```

---

**基本写法：生成时间报告**
`cloud-init analyze dump`
```bash
# 输出时间分析 JSON
cloud-init analyze dump -i /var/log/cloud-init.log > timing.json
```

---

**基本写法：验证 user-data**
`cloud-init schema --config-file <文件>`
```bash
# 验证 user-data 配置正确性
cloud-init schema --config-file user-data.yaml
```

---

## 云平台集成

**基本写法：AWS EC2 启动模板**
```bash
# 通过 AWS CLI 创建带 user-data 的启动模板
aws ec2 create-launch-template \
  --launch-template-name my-template \
  --launch-template-data '{
    "ImageId": "ami-0c55b159cbfafe1f0",
    "InstanceType": "t3.micro",
    "UserData": "'"$(base64 -w 0 user-data.sh)"'"
  }'
```

---

**基本写法：Azure VM 自定义数据**
```bash
# 通过 Azure CLI 创建 VM 时传入 cloud-init
az vm create \
  --name my-vm \
  --resource-group my-rg \
  --image Ubuntu2204 \
  --custom-data @cloud-init.yaml \
  --admin-username azureuser
```

---

**基本写法：GCP GCE 启动脚本**
```bash
# 通过 gcloud 创建 GCE 实例并传入 cloud-init
gcloud compute instances create my-instance \
  --zone=us-central1-a \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --metadata-from-file user-data=cloud-init.yaml
```

---

**基本写法：OpenStack 创建实例**
```bash
# OpenStack 使用 cloud-init
openstack server create \
  --flavor m1.medium \
  --image ubuntu-22.04 \
  --user-data cloud-init.yaml \
  my-instance
```

---

**基本写法：Vagrant 集成**
```ruby
# Vagrantfile 使用 cloud-init
Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  config.vm.provider "virtualbox" do |vb|
    vb.memory = 2048
  end
  config.vm.provision "file", source: "./cloud-init.yaml", destination: "/tmp/cloud-init.yaml"
  config.vm.provision "shell", inline: "cloud-init --file /tmp/cloud-init.yaml init"
end
```

---

## 高级应用

**基本写法：Power State 控制**
```yaml
#cloud-config
power_state:
  mode: reboot
  message: "Rebooting after cloud-init"
  timeout: 30
  condition: True
```

---

**基本写法：Phone Home 通知**
```yaml
#cloud-config
phone_home:
  url: http://config.example.com/register
  post: [ instance_id, hostname, fqdn ]
  tries: 10
```

---

**基本写法：设置时区**
```yaml
#cloud-config
timezone: Asia/Shanghai
locale: zh_CN.UTF-8
```

---

**基本写法：NTP 配置**
```yaml
#cloud-config
ntp:
  enabled: true
  ntp_client: chrony
  servers:
    - ntp.aliyun.com
    - cn.pool.ntp.org
  pools:
    - 0.cn.pool.ntp.org
```

---

**基本写法：指定数据源**
```yaml
#cloud-config
datasource_list:
  - Ec2
  - Azure
  - GCE
  - OpenStack
  - NoCloud
  - ConfigDrive
datasource:
  Ec2:
    timeout: 30
    max_wait: 120
```
