---
order: 610
title: cloud-init 云实例初始化
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'cloud-init 学习笔记：让新虚拟机在第一次开机时自动完成全部配置——user-data 语法、执行阶段、调试与三大云平台的接法。'
author: fanquanpp
updated: '2026-10-11'
related:
  - 'cloud-computing/050-VirtualizationTech'
  - 'cloud-computing/410-IaC'
  - 'devops/220-AnsiblePlaybookConfigManagement'
prerequisites:
  - 'cloud-computing/050-VirtualizationTech'
---

## 场景

你在云上启动一台 Ubuntu 虚拟机跑 Web 服务。手动方式：SSH 上去、装 nginx、建部署账号、挂数据盘、改时区……每开一台重复一遍，十台之后必然漏一台。cloud-init 是各大云镜像内置的"第一次开机自动配置"标准机制：你把一份配置（user-data）随实例一起提交，实例首次启动时自己完成初始化。

目标：写一份能直接投递的 user-data，跑通"开箱即服"，并学会它失败时怎么排查——这是使用 cloud-init 的两大基本功。

## 核心心智模型

先记住三句话，比任何命令都重要：

1. **user-data 只在实例第一次启动时执行一次。** 改了 user-data 再重启不会生效，必须重建实例（或 `cloud-init clean` 后重来）。
2. **cloud-init 按阶段（stage）执行**，常见配置项分属不同阶段，执行顺序固定。
3. **`#cloud-config` 是声明式 YAML，shell 脚本是命令式**——同一个 user-data 里二选一开头，别混。

执行阶段与对应配置项：

```text
bootcmd 阶段         bootcmd         （每张网卡起来就跑，最早）
init 阶段            主机名、SSH 密钥、挂载
config 阶段          write_files、时区、NTP
final 阶段           packages、users、runcmd、power_state（最常用，可联网后）
```

`runcmd` 放在 final 阶段意味着它执行时软件源、网络都已就绪——把"装完包后要做的事"放这里，顺序天然正确。

## 第一步：最简单的两种 user-data

格式一：声明式 cloud-config（首选，幂等、可校验）：

```yaml
# user-data.yaml —— 首行必须是 #cloud-config
#cloud-config
hostname: web-server
package_update: true
packages:
  - nginx
  - git
  - htop
  - curl
```

格式二：`#!/bin/bash` 开头的 shell 脚本（快速原型用）：

```bash
#!/bin/bash
set -e
apt-get update
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
```

两种格式怎么选：脚本写起来快但容易写坏（网络没好就 apt）、无法校验；cloud-config 有 schema 校验（下文 `cloud-init schema`），生产用它，临时验证用脚本。

## 第二步：一份完整的开机自配置

下面这份组合了最常用的模块：软件源、包、部署用户、文件、磁盘、服务。投递后新机器开机 2-3 分钟即可直接使用：

```yaml
#cloud-config
hostname: web-server
manage_etc_hosts: true
timezone: Asia/Shanghai

# 软件包：更新索引 + 批量安装
package_update: true
packages:
  - nginx
  - docker.io

# 添加第三方软件源（Docker 官方源示例）
apt:
  sources:
    docker.list:
      source: "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
      keyid: 9DC858229FC7DD38854AE2D88D81803C0EBFCD88

# 创建部署用户：免密 sudo + 注入公钥
users:
  - default
  - name: deploy
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: sudo, docker
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2E... user@example.com

# 安全基线：禁密码登录、禁 root 直登
ssh_pwauth: false
disable_root: true

# 写入应用配置文件
write_files:
  - path: /etc/myapp/config.yaml
    content: |
      server:
        port: 8080
        host: 0.0.0.0
    owner: root:root
    permissions: '0644'
  # append: true 可以往已有文件追加（比如补 hosts 记录）
  - path: /etc/hosts
    content: |
      10.0.0.5  db.internal
      10.0.0.6  cache.internal
    append: true

# final 阶段才执行：此时网络与包管理器已就绪
runcmd:
  - mkdir -p /data/app
  - chown -R deploy:deploy /data
  - systemctl enable nginx
  - systemctl restart nginx
```

给默认用户追加公钥的简写（不建新用户时）：

```yaml
#cloud-config
ssh_authorized_keys:
  - ssh-rsa AAAAB3NzaC1yc2E... admin@example.com
  - ssh-ed25519 AAAAC3NzaC1lZDI1... deploy@example.com
```

## 第三步：投递——三大云平台的接法

同一份文件，各平台入口参数不同：

```bash
# AWS：放进启动模板（UserData 需 Base64）
aws ec2 create-launch-template \
  --launch-template-name my-template \
  --launch-template-data '{
    "ImageId": "ami-0c55b159cbfafe1f0",
    "InstanceType": "t3.micro",
    "UserData": "'"$(base64 -w 0 user-data.yaml)"'"
  }'

# Azure：--custom-data 直接传文件
az vm create \
  --name my-vm \
  --resource-group my-rg \
  --image Ubuntu2204 \
  --custom-data @user-data.yaml \
  --admin-username azureuser

# GCP：挂在 user-data 元数据键下
gcloud compute instances create my-instance \
  --zone=us-central1-a \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --metadata-from-file user-data=user-data.yaml

# OpenStack：--user-data 传文件
openstack server create \
  --flavor m1.medium \
  --image ubuntu-22.04 \
  --user-data user-data.yaml \
  my-instance
```

user-data 本质是实例元数据的一部分。机器起来后可以从元数据服务（169.254.169.254）反查自己被喂了什么——排查"配置到底传进去没有"的第一步：

```bash
# AWS 元数据与用户数据
curl -s http://169.254.169.254/latest/meta-data/instance-id
curl -s http://169.254.169.254/latest/user-data
```

## 第四步：调试——cloud-init 的排错四件套

user-data 没生效或卡住时，按这个顺序查：

```bash
# 1. 状态：跑完没有？有没有错？
cloud-init status
cloud-init status --wait     # 脚本里阻塞等待初始化完成（CI 里很有用）
cloud-init status --long     # 带错误详情

# 2. 日志：两个文件分工明确
sudo cat /var/log/cloud-init.log | less              # cloud-init 自身流程
sudo tail -n 100 /var/log/cloud-init-output.log      # runcmd 等命令的 stdout/stderr

# 3. 校验：投递前本地查语法
cloud-init schema --config-file user-data.yaml

# 4. 耗时：哪个阶段慢
cloud-init analyze show -i /var/log/cloud-init.log
cloud-init analyze dump -i /var/log/cloud-init.log > timing.json

# 重来一遍：清状态 + 清日志 + 重启，重新执行初始化
sudo cloud-init clean --logs --reboot

# 版本与子命令
cloud-init --version
cloud-init --help
```

经验法则：**八成的失败是 YAML 语法或模块名拼错**，`schema` 一查便知；`runcmd` 里的命令报错则去 `-output.log` 找。本地测试可以先用 LXD/ Multipass 起个 Ubuntu 容器，`cloud-init clean` + 重启快速迭代。

## 进阶配方（按需取用）

### 磁盘：格式化与挂载

```yaml
#cloud-config
disk_setup:
  /dev/vdb:
    table_type: gpt
    layout: true
    overwrite: false          # 绝不对已有数据盘设 true
fs_setup:
  - device: /dev/vdb
    filesystem: ext4
    label: data

mounts:
  - [ /dev/vdb, /data, ext4, "defaults,noatime,nofail", "0", "2" ]
  - [ /dev/vdc, /logs, xfs, "defaults,nofail", "0", "0" ]
  - [ tmpfs, /tmp, tmpfs, "defaults,size=2G", "0", "0" ]
```

`nofail` 值得专门解释：数据盘偶尔不在（换盘、快照恢复）时，没有 nofail 的挂载项会让整机卡在启动 emergency mode。数据盘挂载一律带 `nofail`。

RAID 与 LVM 也能声明式完成：

```yaml
#cloud-config
disk_setup:
  md0:
    table_type: mbr
    layout: [ /dev/vdb, /dev/vdc ]
    overwrite: true
raid:
  md0:
    devices: [ /dev/vdb, /dev/vdc ]
    level: 1
    metadata: 1.2
    name: md0
```

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

### 网络：静态 IP、多网卡、Bond、VLAN

cloud-config 网络配置采用 netplan 语法（Ubuntu 系镜像）：

```yaml
#cloud-config
version: 2
ethernets:
  eth0:
    addresses: [10.0.1.100/24]
    gateway4: 10.0.1.1
    nameservers:
      addresses: [8.8.8.8, 1.1.1.1]
    routes:
      - to: 10.0.0.0/16
        via: 10.0.1.1
  eth1:
    addresses: [192.168.1.50/24]
    routes:
      - to: 192.168.0.0/16
        via: 192.168.1.1
```

注意 `gateway4` 在新版 netplan 已标记弃用，改用默认路由写法更稳妥：

```yaml
routes:
  - to: default
    via: 10.0.1.1
```

Bond（链路聚合）与 VLAN 同样是 version 2 语法：

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
    routes:
      - to: default
        via: 10.0.1.1
vlans:
  vlan100:
    id: 100
    link: eth0
    addresses: [10.100.0.10/24]
```

提醒：多数公有云的网络由云平台管理（DHCP），手写静态网络配置通常只用于自有虚拟化环境（OpenStack/Proxmox/KVM），公有云上乱改会把 SSH 改断。

### 自定义 systemd 服务

应用以 systemd 服务形式常驻是经典需求：write_files 写 unit 文件 + runcmd 启用：

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

### 首选阶段与其他杂项

```yaml
#cloud-config
# bootcmd：最早执行，网络未必就绪，只放不依赖网络的轻量命令
bootcmd:
  - echo "Boot at $(date)" >> /var/log/boot.log
  - mkdir -p /mnt/data

# 安装指定版本（列表形式 [包名, 版本]）
packages:
  - [nginx, 1.18.0-0ubuntu1]

# Snap 包
snap:
  commands:
    - snap install --classic code
    - snap install go --channel 1.22/stable --classic

# 完成后自动重启（装了内核更新时）
power_state:
  mode: reboot
  message: "Rebooting after cloud-init"
  timeout: 30
  condition: True

# 上报注册：把实例信息 POST 给内部配置中心
phone_home:
  url: http://config.example.com/register
  post: [ instance_id, hostname, fqdn ]
  tries: 10

# 时间同步
ntp:
  enabled: true
  ntp_client: chrony
  servers:
    - ntp.aliyun.com
    - cn.pool.ntp.org
  pools:
    - 0.cn.pool.ntp.org

# 数据源探测顺序（离线/私有环境收紧探测可加快启动）
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

还有两个少用但要知道的：`chpasswd` 设用户密码（`expire: false` 防首次登录强制改密）；`cloud_final_modules` 可整体重排 final 阶段模块顺序，属于深度定制，改前先读官方模块文档。

## 坑点清单

| 坑 | 现象 | 对策 |
| :--- | :--- | :--- |
| 改 user-data 后重启期望生效 | 什么都没变 | user-data 仅首启执行；重建实例或 clean 后重跑 |
| 首行忘写 `#cloud-config` | 文件被当 shell 脚本执行报错 | 投递前跑 `cloud-init schema` 校验 |
| cloud-config 和 shebang 混用 | 行为诡异 | 一个文件一种格式 |
| 数据盘挂载没加 nofail | 盘不在时整机卡 emergency mode | 数据盘一律 nofail |
| `disk_setup` 的 overwrite 误设 true | 已有数据被格式化 | 新盘才允许 overwrite |
| 公有云上写死静态 IP | SSH 失联 | 公有云用 DHCP，静态网络留给私有环境 |
| runcmd 命令静默失败 | 机器"看起来好了"但服务没起 | 用 `status --long` + output.log 检查，关键服务跑自检 |
| 密码明文写进 user-data | 密码可从元数据接口读到 | 用密钥登录，或接密钥管理系统 |

## 自检

1. `runcmd` 里的 `apt-get update` 和顶层 `package_update: true` 有什么区别？该用哪个？
2. 实例启动 10 分钟了 SSH 还连不上，说出你排查的前三步。
3. 为什么 write_files 放配置文件、runcmd 放启动命令，而不是全部塞进一个脚本？

## 练习

1. 在任一云（或 Multipass 本地）投递本篇第二节的完整 user-data，目标：开机后不 SSH 直接 curl 到 nginx 欢迎页。
2. 故意在 runcmd 里写一条会失败的命令，投递后用 status/log 四件套定位它，再用 `cloud-init clean --logs --reboot` 修复重跑。
3. 给 user-data 加一块数据盘的格式化挂载，对比加与不加 `nofail` 时摘掉盘后的启动行为。

## 下一步

- 配置不只发生在首启：持续配置管理交给 Ansible，见 [Ansible Playbook 配置管理](/devops/220-AnsiblePlaybookConfigManagement)，与 cloud-init 是"开机初始化 + 长期运维"的分工。
- 把实例与 user-data 一起代码化：见 [基础设施即代码](/cloud-computing/410-IaC)。
- cloud-config 模块全集以官方文档为准：https://cloudinit.readthedocs.io
