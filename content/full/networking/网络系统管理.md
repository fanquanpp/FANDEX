---
order: 2
title: 网络系统管理
module: networking
category: 网络技术
difficulty: intermediate
description: 'Windows Server部署、活动目录、DNS/DHCP/IIS/文件/终端服务、组策略、Linux服务器、Shell脚本、数据中心网络、无线网络规划与安全。'
author: fanquanpp
updated: '2026-06-14'
related:
  - networking/网络基础与协议
  - networking/网络布线与施工
  - 'networking/OSI与TCP-IP模型'
prerequisites: []
---

## 1. Windows Server 部署

### 1.1 Windows Server 版本

| 版本                | 特点                   | 适用场景     |
| :------------------ | :--------------------- | :----------- |
| Windows Server 2022 | 安全性增强、Azure 混合 | 企业生产环境 |
| Windows Server 2019 | 稳定成熟               | 通用服务器   |
| Windows Server 2016 | Nano Server            | 轻量容器化   |

### 1.2 服务器初始化

```powershell
# 修改计算机名
Rename-Computer -NewName "DC01" -Restart

# 配置静态 IP
New-NetIPAddress -InterfaceIndex 12 -IPAddress 192.168.1.10 `
  -PrefixLength 24 -DefaultGateway 192.168.1.1
Set-DnsClientServerAddress -InterfaceIndex 12 `
  -ServerAddresses 192.168.1.10,8.8.8.8

# 启用远程桌面
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' `
  -name "fDenyTSConnections" -value 0
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"

# Windows Update 配置
Install-Module PSWindowsUpdate -Force
Get-WindowsUpdate -AcceptAll -Install -AutoReboot
```

## 2. 活动目录域服务（AD DS）

### 2.1 域控制器安装

```powershell
# 安装 AD DS 角色
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools

# 提升为域控制器（新建林）
Install-ADDSForest -DomainName "fandex.local" `
  -DomainNetbiosName "FANDEX" `
  -ForestMode WinThreshold `
  -DomainMode WinThreshold `
  -DatabasePath "C:\Windows\NTDS" `
  -LogPath "C:\Windows\NTDS" `
  -SysvolPath "C:\Windows\SYSVOL" `
  -SafeModeAdministratorPassword (ConvertTo-SecureString "P@ssw0rd" -AsPlainText -Force) `
  -Force
```

### 2.2 组织单位与用户管理

```powershell
# 创建组织单位
New-ADOrganizationalUnit -Name "研发部" -Path "DC=fandex,DC=local"
New-ADOrganizationalUnit -Name "运维部" -Path "DC=fandex,DC=local"

# 批量创建用户
$users = @(
  @{Name="张三"; SamAccountName="zhangsan"; Dept="研发部"},
  @{Name="李四"; SamAccountName="lisi"; Dept="运维部"}
)
foreach ($u in $users) {
  New-ADUser -Name $u.Name -SamAccountName $u.SamAccountName `
    -UserPrincipalName "$($u.SamAccountName)@fandex.local" `
    -Path "OU=$($u.Dept),DC=fandex,DC=local" `
    -AccountPassword (ConvertTo-SecureString "P@ssw0rd" -AsPlainText -Force) `
    -Enabled $true
}

# 创建安全组
New-ADGroup -Name "研发组" -GroupScope Global -Path "OU=研发部,DC=fandex,DC=local"
Add-ADGroupMember -Identity "研发组" -Members "zhangsan"
```

## 3. DNS 服务配置

### 3.1 DNS 服务器安装与配置

```powershell
# 安装 DNS 角色
Install-WindowsFeature -Name DNS -IncludeManagementTools

# 创建正向查找区域
Add-DnsServerPrimaryZone -Name "fandex.local" -ZoneFile "fandex.local.dns"

# 添加 A 记录
Add-DnsServerResourceRecordA -Name "web" -IPv4Address "192.168.1.20" `
  -ZoneName "fandex.local"

# 添加 CNAME 记录
Add-DnsServerResourceRecordCName -Name "www" -HostNameAlias "web.fandex.local" `
  -ZoneName "fandex.local"

# 添加 MX 记录
Add-DnsServerResourceRecordMX -Name "." -MailExchange "mail.fandex.local" `
  -Preference 10 -ZoneName "fandex.local"
```

### 3.2 DNS 区域类型

| 区域类型 | 说明                 | 适用场景      |
| :------- | :------------------- | :------------ |
| 主要区域 | 可读写的区域副本     | 主 DNS 服务器 |
| 辅助区域 | 只读的区域副本       | 备份 DNS      |
| 存根区域 | 仅包含 NS/SOA/A 记录 | 跨域解析      |

## 4. DHCP 服务配置

```powershell
# 安装 DHCP 角色
Install-WindowsFeature -Name DHCP -IncludeManagementTools

# 授权 DHCP 服务器
Add-DhcpServerInDC -DnsName "DC01.fandex.local"

# 创建作用域
Add-DhcpServerv4Scope -Name "办公网" -StartRange 192.168.1.100 `
  -EndRange 192.168.1.200 -SubnetMask 255.255.255.0 `
  -State Active

# 配置作用域选项
Set-DhcpServerv4OptionValue -ScopeId 192.168.1.0 `
  -DnsServer 192.168.1.10 -Router 192.168.1.1 `
  -DnsDomain "fandex.local"

# 排除地址范围
Add-DhcpServerv4ExclusionRange -ScopeId 192.168.1.0 `
  -StartRange 192.168.1.150 -EndRange 192.168.1.160

# DHCP 保留（绑定 MAC）
Add-DhcpServerv4Reservation -ScopeId 192.168.1.0 `
  -IPAddress 192.168.1.50 -ClientId "00-15-5D-01-02-03" `
  -Description "打印机"
```

## 5. IIS Web 服务

```powershell
# 安装 IIS
Install-WindowsFeature -Name Web-Server -IncludeManagementTools

# 创建网站
New-IISSite -Name "FANDEX-Web" -PhysicalPath "C:\inetpub\fandex" `
  -BindingInformation "*:80:www.fandex.local"

# 配置 HTTPS 绑定
New-IISSiteBinding -Name "FANDEX-Web" `
  -BindingInformation "*:443:www.fandex.local" `
  -Protocol https -CertificateThumbprint (Get-ChildItem Cert:\LocalMachine\My)[0].Thumbprint

# 应用程序池配置
Set-IISAppPool -Name "FANDEX-Web Pool" -ManagedRuntimeVersion "v4.0" `
  -ProcessModelIdleTimeout "00:30:00" -PeriodicRestartTime "1.00:00:00"
```

## 6. 文件服务

```powershell
# 安装文件服务角色
Install-WindowsFeature -Name FS-FileServer -IncludeManagementTools

# 创建共享文件夹
New-Item -Path "D:\Share\Public" -ItemType Directory -Force
New-SmbShare -Name "Public" -Path "D:\Share\Public" `
  -FullAccess "FANDEX\Domain Admins" `
  -ChangeAccess "FANDEX\研发组" `
  -ReadAccess "Everyone"

# 配置 NTFS 权限
$acl = Get-Acl "D:\Share\Public"
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
  "FANDEX\研发组", "Modify", "ContainerInherit,ObjectInherit", "None", "Allow"
)
$acl.SetAccessRule($rule)
Set-Acl "D:\Share\Public" $acl

# 配置磁盘配额
New-FsrmQuota -Path "D:\Share\Public" -Size 10GB `
  -Description "公共目录10GB配额"
```

## 7. 终端服务（RDS）

```powershell
# 安装远程桌面服务
Install-WindowsFeature -Name RDS-RD-Server,RDS-Licensing -IncludeManagementTools

# 配置 RDS 授权模式
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server' `
  -Name "LicensingMode" -Value 4    # 4=Per-User

# 指定许可证服务器
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\LicenseServers' `
  -Name "ServerName" -Value "DC01.fandex.local"
```

## 8. 组策略管理

### 8.1 常用组策略

```powershell
# 创建 GPO
New-GPO -Name "安全基线策略" -Comment "企业安全基线配置"

# 链接 GPO 到 OU
New-GPLink -Name "安全基线策略" -Target "OU=研发部,DC=fandex,DC=local"

# 配置 GPO 注册表设置
Set-GPRegistryValue -Name "安全基线策略" `
  -Key "HKLM\Software\Policies\Microsoft\Windows\WindowsUpdate\AU" `
  -ValueName "AUOptions" -Type DWord -Value 4

# 常用安全策略
# 账户锁定策略
Set-GPRegistryValue -Name "安全基线策略" `
  -Key "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\System" `
  -ValueName "LockoutBadCount" -Type DWord -Value 5

# 禁用 USB 存储
Set-GPRegistryValue -Name "安全基线策略" `
  -Key "HKLM\Software\Policies\Microsoft\Windows\RemovableStorageDevices" `
  -ValueName "Deny_All" -Type DWord -Value 1
```

## 9. Linux 服务器部署

### 9.1 基础服务配置

```bash
# 网络配置（CentOS/Rocky）
nmcli con mod ens33 ipv4.addresses 192.168.1.20/24
nmcli con mod ens33 ipv4.gateway 192.168.1.1
nmcli con mod ens33 ipv4.dns "192.168.1.10,8.8.8.8"
nmcli con mod ens33 ipv4.method manual
nmcli con up ens33

# 防火墙配置
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=8080/tcp
firewall-cmd --reload

# SELinux 管理
setenforce 0                          # 临时关闭
sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config  # 永久
```

### 9.2 常用服务安装

```bash
# Nginx 安装与配置
dnf install nginx -y
systemctl enable --now nginx

# 配置虚拟主机
cat > /etc/nginx/conf.d/fandex.conf << 'EOF'
server {
    listen 80;
    server_name www.fandex.local;
    root /var/www/fandex;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

# MariaDB 安装
dnf install mariadb-server -y
systemctl enable --now mariadb
mysql_secure_installation
```

## 10. Shell 脚本编程

### 10.1 网络巡检脚本

```bash
#!/bin/bash
# 网络设备巡检脚本
# 用法: ./net_check.sh

LOG_FILE="/var/log/net_check_$(date +%Y%m%d).log"
DEVICES=("192.168.1.1" "192.168.1.2" "192.168.1.3")

echo "===== 网络巡检 $(date) =====" | tee -a $LOG_FILE

for ip in "${DEVICES[@]}"; do
    echo "--- 检查设备 $ip ---" | tee -a $LOG_FILE

    # Ping 检测
    if ping -c 3 -W 2 $ip &> /dev/null; then
        echo "[OK] $ip 可达" | tee -a $LOG_FILE
    else
        echo "[FAIL] $ip 不可达" | tee -a $LOG_FILE
    fi

    # 端口检测
    for port in 22 80 443; do
        timeout 2 bash -c "echo > /dev/tcp/$ip/$port" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "[OK] $ip:$port 开放" | tee -a $LOG_FILE
        else
            echo "[WARN] $ip:$port 关闭" | tee -a $LOG_FILE
        fi
    done
done

echo "===== 巡检完成 =====" | tee -a $LOG_FILE
```

### 10.2 自动备份脚本

```bash
#!/bin/bash
# 配置文件自动备份脚本

BACKUP_DIR="/backup/config"
DATE=$(date +%Y%m%d_%H%M%S)
RETAIN_DAYS=30

mkdir -p $BACKUP_DIR

# 备份配置文件
tar czf "$BACKUP_DIR/etc_backup_$DATE.tar.gz" /etc/
tar czf "$BACKUP_DIR/nginx_backup_$DATE.tar.gz" /etc/nginx/

# 清理过期备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETAIN_DAYS -delete

echo "[$DATE] 备份完成，已清理 ${RETAIN_DAYS} 天前的备份"
```

## 11. 数据中心网络搭建

### 11.1 网络架构设计

```
                    ┌─────────────┐
                    │   核心交换机  │ (冗余部署)
                    └──────┬──────┘
               ┌───────────┼───────────┐
        ┌──────┴──────┐         ┌──────┴──────┐
        │  汇聚交换机A │         │  汇聚交换机B │
        └──────┬──────┘         └──────┬──────┘
          ┌────┴────┐            ┌────┴────┐
     ┌────┴──┐ ┌───┴───┐   ┌───┴───┐ ┌───┴──┐
     │接入SW1│ │接入SW2│   │接入SW3│ │接入SW4│
     └───────┘ └───────┘   └───────┘ └──────┘
```

### 11.2 设备命名规范

| 位置   | 设备类型 | 命名格式             | 示例         |
| :----- | :------- | :------------------- | :----------- |
| 核心层 | 交换机   | DC-CORE-01           | DC-CORE-01   |
| 汇聚层 | 交换机   | DC-AGG-{楼栋}-01     | DC-AGG-A1-01 |
| 接入层 | 交换机   | DC-ACC-{楼层}-{编号} | DC-ACC-3F-01 |
| 防火墙 | FW       | DC-FW-01             | DC-FW-01     |
| 路由器 | RT       | DC-RT-01             | DC-RT-01     |

## 12. 无线网络规划

### 12.1 无线地勘与 AP 点位图设计

地勘流程：

1. **现场勘测**：获取建筑平面图，标注墙体材质、门窗位置
2. **信号覆盖模拟**：使用 Ekahau/iBwave 进行信号仿真
3. **AP 点位规划**：根据覆盖面积和用户密度确定 AP 数量
4. **信道规划**：2.4GHz 使用 1/6/11 信道，5GHz 使用非 DFS 信道
5. **功率调整**：边缘场强 ≥ -65dBm，重叠区域 ≥ -75dBm

### 12.2 无线认证配置

```bash
# 华为 AC 配置 WPA2-Enterprise
[AC] wlan
[AC-wlan-view] security-profile name sec-enterprise
[AC-wlan-sec-prof-sec-enterprise] security wpa2 dot1x aes

# 配置 RADIUS 服务器
[AC] radius-server template radius1
[AC-radius-radius1] radius-server authentication 192.168.1.100 1812
[AC-radius-radius1] radius-server accounting 192.168.1.100 1813
[AC-radius-radius1] radius-server shared-key cipher Radius@123

# 802.1X 认证配置
[AC] aaa
[AC-aaa] authentication-scheme auth1
[AC-aaa-authen-auth1] authentication-mode radius
[AC-aaa] domain default
[AC-aaa-domain-default] authentication-scheme auth1
[AC-aaa-domain-default] radius-server radius1
```

### 12.3 AP 隔离

```bash
# 华为 AC 配置用户隔离
[AC] wlan
[AC-wlan-view] traffic-profile name isolate
[AC-wlan-traffic-prof-isolate] user-isolate l2    # 二层隔离
[AC-wlan-traffic-prof-isolate] user-isolate l3    # 三层隔离
```

### 12.4 数据加密

| 加密方式 | 算法     | 安全级别 | 说明               |
| :------- | :------- | :------- | :----------------- |
| WEP      | RC4      | 极低     | 已淘汰             |
| WPA-TKIP | TKIP     | 低       | 兼容旧设备         |
| WPA2-AES | AES-CCMP | 高       | 企业推荐           |
| WPA3-SAE | SAE      | 最高     | 新标准，抗离线字典 |

### 12.5 AC 热备

```bash
# 华为 AC 双机热备配置
[AC1] wlan
[AC1-wlan-view] ac protect enable
[AC1-wlan-view] ac protect protect-ac 192.168.1.2 priority 6
[AC1-wlan-view] ac protect local-ac 192.168.1.1 priority 8

[AC2] wlan
[AC2-wlan-view] ac protect enable
[AC2-wlan-view] ac protect protect-ac 192.168.1.1 priority 8
[AC2-wlan-view] ac protect local-ac 192.168.1.2 priority 6
```
