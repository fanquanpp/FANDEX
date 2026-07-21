# 地理空间

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 基本操作

**单成员写法：添加单个地理位置**
`GEOADD <key> <longitude> <latitude> <member>`
```bash
# 添加天安门的位置
GEOADD locations 116.3975 39.9087 "天安门"
```

**多成员写法：添加多个地理位置**
`GEOADD <key> <longitude> <latitude> <member> [longitude latitude member ...]`
```bash
# 添加天安门和外滩的位置
GEOADD locations 116.3975 39.9087 "天安门" 121.4737 31.2304 "外滩"
```

**单成员写法：获取单个成员坐标**
`GEOPOS <key> <member>`
```bash
# 获取天安门的坐标
GEOPOS locations "天安门"
```

**多成员写法：获取多个成员坐标**
`GEOPOS <key> <member> [member ...]`
```bash
# 获取天安门和外滩的坐标
GEOPOS locations "天安门" "外滩"
```

**基本写法：计算两点距离**
`GEODIST <key> <member1> <member2> [unit]`
```bash
# 计算天安门到外滩的距离（单位km）
GEODIST locations "天安门" "外滩" km
```

---

## 范围查询

**基本写法：按经纬度半径查询附近地点**
`GEOSEARCH <key> FROMLONLAT <lon> <lat> BYRADIUS <radius> <unit> [WITHCOORD] [WITHDIST] [COUNT N] [ASC|DESC]`
```bash
# 查找坐标(116.4, 39.9)附近3公里内的地点，按距离升序返回前10个
GEOSEARCH locations FROMLONLAT 116.4 39.9 BYRADIUS 3 km WITHDIST WITHCOORD COUNT 10 ASC
```

**基本写法：按矩形范围查询**
`GEOSEARCH <key> FROMLONLAT <lon> <lat> BYBOX <width> <height> <unit> [WITHCOORD] [WITHDIST]`
```bash
# 查找矩形范围内的地点（宽10km高10km）
GEOSEARCH locations FROMLONLAT 116.4 39.9 BYBOX 10 10 km WITHDIST
```

**基本写法：以成员为中心查询附近地点**
`GEOSEARCH <key> FROMMEMBER <member> BYRADIUS <radius> <unit> [WITHDIST]`
```bash
# 查找天安门附近5公里内的地点
GEOSEARCH locations FROMMEMBER "天安门" BYRADIUS 5 km WITHDIST
```

**基本写法：旧版按经纬度半径查询**
`GEORADIUS <key> <longitude> <latitude> <radius> <unit> [WITHCOORD] [WITHDIST] [COUNT N]`
```bash
# 旧版范围查询（已废弃，建议使用GEOSEARCH）
GEORADIUS locations 116.4 39.9 3 km WITHCOORD WITHDIST COUNT 10
```

---

## 应用场景

**基本写法：添加用户位置**
`GEOADD <nearby_key> <lon> <lat> <member>`
```bash
# 添加用户42的位置
GEOADD nearby:users 116.4 39.9 "user:42"
```

**基本写法：查找附近用户**
`GEOSEARCH <nearby_key> FROMMEMBER <member> BYRADIUS <radius> <unit> [COUNT N]`
```bash
# 查找用户42附近1km内的用户，最多返回20个
GEOSEARCH nearby:users FROMMEMBER "user:42" BYRADIUS 1 km COUNT 20
```

**多成员写法：添加多个门店位置**
`GEOADD <stores_key> <longitude> <latitude> <member> [longitude latitude member ...]`
```bash
# 添加门店1和门店2的位置
GEOADD stores 116.397 39.908 "store:1" 116.401 39.912 "store:2"
```

**基本写法：查找附近门店按距离升序**
`GEOSEARCH <stores_key> FROMLONLAT <lon> <lat> BYRADIUS <radius> <unit> [WITHDIST] [ASC]`
```bash
# 查找坐标(116.4, 39.9)附近2km内门店，按距离升序
GEOSEARCH stores FROMLONLAT 116.4 39.9 BYRADIUS 2 km WITHDIST ASC
```
