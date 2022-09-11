---
title: ElasticSearch缓存机制介绍
excerpt: ES相关
categories:
  - 中间件
tags:
  - 中间件
  - ElasticSearch
comments: true
layout: post
index_img: /img/milan/20.png
sticky: 10015
abbrlink: 139991641
date: 2022-09-12 01:05:10
---

# 分类

## Node Query Cache(Filter Cache)

节点级别缓存,简称 Filter Cache

### 概念

对查询中包含 filter 过滤器的执行结果进行缓存，缓存在节点查询缓存中，以便快速查找。每个节点都有一个所有分片共享的查询缓存。当缓存空间存满时，使用 LRU 策略清理最近最少使用的查询结果，以腾出空间存放新结果数据。

默认情况下，节点查询缓存最多可容纳10000个查询，最多占总堆空间的10％，为了确定查询是否符合缓存条件，Elasticsearch 维护查询历史记录以跟踪事件的发生。但是，当 segment 的文档数量小于 10000 或者 小于分片文档总数的 3% 时，该查询是不会被缓存的。

由于缓存是按段划分的，因此合并段可使缓存的查询无效。所以 size 比较小的段，即 segment 很快就被合并，所以也不需要给它们建立 query cache 。这也是为啥前述 “segment 的文档数量小于 10000 或者 小于分片文档总数的 3% 时，不会被缓存”的原因。

同时，只有对频繁访问的请求才会使用查询缓存，因为查询缓存是基于 bitmap 的，而建立 bitmap 的过程需要一定的时间。

> filter 查询与普通查询的主要区别就是不会计算评分

Filter Cache 是 Lucene 层面实现的，封装在 LRUQueryCache 类中，默认开启。ES 层面会进行一些策略控制和信息统计。

每个 segment 有自己的缓存，缓存的 key 为 filter 子查询（query clause ），缓存内容为查询结果，这些查询结果就是匹配到的 document numbers，保存在位图 FixedBitSet中。

构建过程是

1. 对 segment 执行子查询的结果，先获取查询结果中最大的 `document number: maxDoc` , document number 是 lucene 为每个 doc 分配的数值编号

2. 创建一个大小为 maxDoc的位图 FixedBitSet，然后遍历查询命中的 doc，将FixedBitSet中对应的bit 设置为1
   比如，查询结果为[1,2,5]，则FixedBitSet中的结果为[1,1,0,0,1]，当整个查询有多个filter子查询时，交并集直接对位图做位运算即可。

### 用途
缓存 filter 查询结果（LRU策略）

对于 TermQuery、MatchAllDocsQuery 等这种查询都不被缓存。当 BooleanQuey 的字节点为空时不会被缓存，当 Dis Max Query 的 Disjuncts 为空时不会被缓存。

对于历史查询次数有要求。消耗高昂的 Query 只需要2次就加入缓存，其他的默认是5次，对于 BooleanQuery 和 DisjunctionMaxQuery 次数为4次。默认历史查询数量是256。

再次重申

**segment 中文档数大于 100000 或大于整个索引大小的 3% 会被缓存**

> 如果想索引所有 segment ，请设置`indices.queries.cache.all_segments`

### 重要配置参数

* index.queries.cache.enabled
  是属于 index 级别的配置，用来控制是否启用缓存，默认是开启的

* indices.queries.cache.size   
  集群中的每个节点都必须有的静态配置，用来控制用来缓存的内存大小，默认是 10%，支持两种格式一种是百分数，代表占节点 heap 的百分比，另一种则是精确的值，比如 512mb。

* indices.queries.cache.count   
  在官方文档并没有写，这是一个节点级别的配置，可以在 elasticsearch.yml 中配置，控制缓存的总数量。默认 10000

* indices.queries.cache.all_segments
  用于是否在所有 Segment 上启用缓存，默认是 false，不会对文档数小于 100000 或者小于整个索引大小的 3% 的 Segment 进行缓存

### API使用方式

创建或关闭(close)索引时设置

``` java
curl -XPUT IP:端口/索引 -d
'{
　　"settings": {
　　　　"index.queries.cache.enabled": true
　　}
}'
```

## Shard Request Cache(Request Cache)

分片级别缓存,简称 Request Cache

### 概念

当对一个或多个索引发送搜索请求时，搜索请求首先会发送到 ES 集群中的某个节点，称之为协调节点；协调节点会把该搜索请求分发给其他节点并在相应分片上执行搜索操作，我们把分片上的执行结果称为“本地结果集”，之后，分片再将执行结果返回给协调节点；协调节点获得所有分片的本地结果集之后，合并成最终的结果并返回给客户端。

仔细阅读 es 源码可知该缓存的实现在 IndicesRequestCache 类中。

见下代码

``` java
final Key key =  new Key(cacheEntity, reader.getReaderCacheHelper().getKey(), cacheKey);
```

可知缓存的 key 由下列这些部分组成

* cacheEntity
  shard 信息，代表该缓存是哪个 shard 上的查询结果

* readerCacheKey
  用于区分不同的 IndexReader

* cacheKey
  整个客户端请求体（source）和请求参数（preference、indexRoutings、requestCache等）。由于客户端请求信息直接序列化为二进制作为缓存 key 的一部分，所以客户端请求的 json 顺序，聚合名称等变化都会导致 cache 无法命中

缓存的 value 就是将查询结果序列化之后的二进制数据

### 用途
默认用于缓存 size=0 的请求，aggs 和 suggestions，还有就是 hits.total

但是不会缓存 hits

> 另外还有下列一些情况不会缓存
> 范围查询带有now，由于它是毫秒级别的，缓存下来没有意义
> 类似的还有在脚本查询中使用了 Math.random() 等函数的查询也不会进行缓存

分片索引 refresh 时候，如果数据发生了实际变化，那么缓存就会自动失效。默认情况，是每隔1秒钟失效一次。所以，refresh 间隔时间越长，那缓存时间也越长。采用的也是 LRU 策略。

> 使用 `index.refresh_interval` 参数来设置 refresh 的刷新时间间隔
> 虽然还可以设置 `indices.request.cache.expire` 指定失效时间（单位为分钟），但因为每次索引 refresh 时，缓存都会自动失效。所以设置这个参数没有意义。

### 重要配置参数

* index.requests.cache.enable
  这个参数用来控制是否启用分片级别的缓存，默认是false

* indices.requests.cache.size
  用来控制缓存在heap中的大小，默认是JVM堆内存的1%。

> 请求时禁用缓存
> 通过url传参方式request_cache=true
> 使用方式为
> `curl -XPOST 'IP:端口/索引/_cache/clear?request_cache=true'`

### API使用方式

Request Cache 默认是关闭的，因此可以在创建新的索引时候启用。还有一种方式就是通过动态参数配置设置。

两种使用方式如下

1. 创建新的索引时候启用

``` java
curl -XPUT IP:端口/索引 -d
'{
　　"settings": {
　　　　"index.requests.cache.enable": true
　　}
}'
```

2. 动态参数配置

``` java
curl -XPUT IP:端口/索引/_settings -d 
'{ 
    "index.requests.cache.enable": true 
}'
```

要想搜索请求被缓存，必须加上 `request_cache=true` 参数

举例

``` java
curl -XGET 'IP:端口/索引/_search?request_cache=true&pretty' -H 'Content-Type: application/json' -d
'{
  "size": 0,
  "aggs": {
    "yyy": {
      "terms": {
        "field": "xxx"
      }
    }
  }
}'
```

此时必须强制制定 `"size": 0` 否则设置了 `request_cache=true` 也没用。

还有前述脚本查询时候，因为可能使用了 random 这样的函数或 now，搜索结果数据每次都会变化。所以此时缓存会自动无效，一定要指定 `request_cache=false` 来禁用 Request Cache 缓存


## Filter Cache 和 Request Cache 区别

| <div style="width: 150pt"></div> |<div style="width: 150pt">Filter Cache</div> | <div style="width: 150pt">Request Cache</div>|
|:--------------------------------------------------------------------:|:-------------:|:-----------:|
|                                 实现层面                                 | Lucene   | ES   |
|                                 缓存策略                                 | LRU   | LRU   |
|                                 查询对象                                 | segment   | shard   |
|                                 失效时机                                 | merge   | refresh   |
|                                 访问频率                                 | 与频率有关   | 与频率无关   |
|                                 key                                  | filter 子查询   | 整个客户端请求   |
|                                value                                 | FixedBitSet   | 查询结果序列化之后<br>的二进制数据    |
|                                  用途                                  | 对数值类型的<br> filter 子查询结果缓存 | 对聚合结果缓存   |

## Field data Cache

segment 级别

### 概念

ES 不像关系型数据库那样采用“列式存储”，而是基于一个 “term” 到 “document” 的倒排。这种情况下，如果需要做数据聚合和排序，就需要将倒排索引的数据读取出来，重新组织成一个数组缓存，也就是从倒排索引中生成出要自己维护的 Cache， 然后才能高效的做排序和聚合计算。

为了解决这个问题，使用 Field data Cache 字段数据缓存，它主要用于字段的排序和聚合，


### 用途

用于对 text 类型的字段，进行sort或aggs。

将所有的字段值加载到内存中，以便提供基于文档快速访问这些值。当第一次在某个分词的字段上执行聚合、排序或通过脚本访问的时候就会触发该字段 Field data Cache 加载，因为是 segment 级别的，当有新的 segment 打开时，旧的缓存不会重新加载，而是直接把新 segment 对应的 Field data Cache 加载到内存。

> 因为是基于 segment 级别的，所以 Field data Cache 失效和 Filter Cache 失效一样在 segment 被合并后才失效。

由于它是将所有字段值加载到内存，以便为这些值提供快速的基于文档的检索访问。 所以，field data cache 对于一个字段的构建来说非常昂贵，最好能分配足够的内存以保障它能长时间处于被加载的状态。否则会引发 JVM 的 OOM 现象。也因为这个原因，该功能本身也在 es 里是默认关闭的。

> 对于 text 类型字段进行sort或aggs等获取字段值行为时，才会用到 field data，但是在 text 类型上执行聚合一般没有意义的，因此建议慎用该缓存

### 重要配置参数

* indices.fielddata.cache.size
  用来控制缓存的大小，支持两种格式，一种是百分数，代表占节点heap的百分比，另一种是精确值，如10gb，默认无限。

* indices.breaker.fielddata.limit
  设置 field data 断路器限制大小（公式: 预计算内存 + 现有内存 <= 断路器设置内存限制），默认是JVM堆内存的60%，当查询尝试加载更多数据到内存时会抛异常（以此来阻止 JVM OOM 发生）

* indices.breaker.fielddata.overhead
  一个表示内存预估值系数的常数，默认1.03。比如预计算加载100M数据，那么100 * 1.03=103M 会用 103M 作为参数来计算，是否超过断路器设置的最大值。

# 手工清除

上述三种缓存都可以通过 API 方式清除。

试举几例

1. 清除整个集群的缓存

``` java
curl -XPOST 'IP:端口/_cache/clear'
```

2. 清除某个索引下的所有缓存

``` java
curl -XPOST 'IP:端口/索引/_cache/clear'
```

3. 清理整个集群的 fliter cache

``` java
curl -XPOST 'IP:端口/_cache/clear?query=true'
```

4. 清理整个集群的 request cache

``` java
curl -XPOST 'IP:端口/_cache/clear?request=true'
```

5. 清理整个集群的 field data cache

``` java
curl -XPOST 'IP:端口/_cache/clear?fielddata=true'
```

6. 清理某个索引下的 fliter cache

``` java
curl -XPOST 'IP:端口/索引/_cache/clear?query=true'
```

7. 清理某个索引下的 request cache

``` java
curl -XPOST 'IP:端口/索引/_cache/clear?request=true'
```

8. 清理某个索引下的 field data cache

``` java
curl -XPOST 'IP:端口/索引/_cache/clear?fielddata=true'
```

9. 通过 fields 参数指定清理部分字段的缓存

``` java
curl -XPOST 'IP:端口/索引/_cache/clear?fields=xxx,yyy'
```

> 不建议生产环境中进行缓存的手工清除，会对查询性能有较大影响。建议一般只用于测试和验证时候


# 监控

我们通常只需要关心缓存占用的空间大小，以及命中率等信息，一般需要在两个层面观测缓存使用情况，一个是节点级别，一个是索引级别。

## 节点级别

``` java
curl -XGET '/_cat/nodes?v&h=name,queryCacheMemory,fielddataMemory,requestCacheMemory,requestCacheHitCount,requestCacheMissCount'
```

> 通过 hitCount / (hitCount + missCount) 可以计算命中率

``` java
curl -XGET '/_nodes/stats/indices/query_cache,request_cache,fielddata?pretty&human'
```

## 索引级别

``` java
curl -XGET 'IP:端口/索引/_stats/query_cache,fielddata,request_cache?pretty&human'
```

# 参考资料

1. [elasticsearch实际总结\(4\)—— 查询缓存](https://segmentfault.com/a/1190000040238635)

2. [elasticsearch中文文档](http://doc.codingdict.com/elasticsearch/index.html)
