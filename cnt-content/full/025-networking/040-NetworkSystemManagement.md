---
order: 70
title: 网络系统管理
module: 'networking'
category: 云与基础设施
difficulty: intermediate
description: Windows Server部署、活动目录、DNS/DHCP/IIS/文件/终端服务、组策略与 Linux 服务器系统管理。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'networking/030-NetworkWiringAndConstruction'
  - 'networking/020-OSITCPIPModel'
prerequisites: []
---

## 学习目标

## 知识点地图

- **知识类别**：网络背后的服务器系统管理——Windows Server 的域环境（AD/DNS/DHCP/组策略）与 Linux 服务器的部署运维。网络设备之外，「提供网络服务的主机」如何管理是本篇主题。
- **解决什么问题**：公司几十上百台电脑要统一账号、统一策略、统一软件下发（AD + 组策略）；内网要自动发地址与域名解析（DHCP/DNS）；Linux 服务器要部署与写自动化脚本。
- **什么时候用到**：搭建公司域环境；新服务器上线装服务；批量管理终端；故障排查时判断「是网络问题还是服务器问题」。

本文是「Networking」模块的第 4 篇，难度定位为进阶。重点内容：Windows Server部署、活动目录、DNS/DHCP/IIS/文件/终端服务、组策略与 Linux 服务器系统管理。

主要章节：

- 1. Windows Server 部署
- 2. 活动目录域服务（AD DS）
- 3. DNS 服务配置
- 4. DHCP 服务配置
- 5. IIS Web 服务
- 6. 文件服务
- ……共 12 个章节

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

> 本文原 §11 数据中心网络搭建、§12 无线网络规划已按主题归并：三层架构与设备命名规范并入
> 180-NetworkDesignPlanning，无线规划与 AC 热备并入 170-WirelessNetwork。本文专注服务器
> 系统管理主线。

## 动手实践

**练习 1（最小域环境）**：在一台 Windows Server 评估版虚机上完成「装系统 -> 提升为域控 -> 建一个 OU -> 建一个用户 -> 客户端加域」全流程，记录每步的图形界面路径与等价 PowerShell 命令。

**提示**：提升域控用 `Install-WindowsFeature AD-Domain-Services` + `Install-ADDSForest`；加域客户端注意 DNS 必须指向域控。

**练习 2（DHCP 排错）**：故意把 DHCP 作用域排除范围覆盖整个地址段，观察客户端拿到 169.254.x.x 的表现；修复后再用 `ipconfig /release` + `/renew` 观察 DORA 四步（可在服务端事件日志看到）。

**提示**：169.254 是 APIPA 自动私有地址，客户端收不到 OFFER 时的自保行为。

**练习 3（组策略实验）**：建一条 GPO：给域内所有用户桌面放一个说明文件、禁用控制面板。用 `gpupdate /force` 下发，客户端用 `gpresult /r` 验证策略命中。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```powershell
# 练习 1（域控核心命令）
Install-WindowsFeature AD-Domain-Services -IncludeManagementTools
Install-ADDSForest -DomainName "lab.local" -DomainNetbiosName "LAB" `
  -SafeModeAdministratorPassword (Read-Host -AsSecureString "DSRM")
New-ADOrganizationalUnit -Name "Dev" -Path "DC=lab,DC=local"
New-ADUser -Name "alice" -Path "OU=Dev,DC=lab,DC=local" `
  -AccountPassword (Read-Host -AsSecureString "pwd") -Enabled $true
# 客户端：DNS 指向域控 IP 后，系统属性 -> 加入域 lab.local

# 练习 2
# 服务端装 DHCP 角色后：
Add-DhcpServerv4Scope -Name "LAN" -StartRange 192.168.56.100 `
  -EndRange 192.168.56.200 -SubnetMask 255.255.255.0
# 客户端：ipconfig /release; ipconfig /renew → 观察 DORA（Discover/Offer/Request/Ack）

# 练习 3
New-GPO -Name "LabPolicy" | New-GPLink -Target "OU=Dev,DC=lab,DC=local"
# 组策略管理编辑器里配置桌面文件与限制后，客户端执行：
gpupdate /force
gpresult /r    # 输出 Applied GPOs 列表核对
```

</details>
