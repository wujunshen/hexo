---
title: ElasticSearch自定义中文分词插件开发介绍
excerpt: ES相关
categories:
  - 中间件
tags:
  - 中间件
  - ElasticSearch
  - GraalVM
comments: true
layout: post
index_img: /img/milan/19.png
sticky: 10005
abbrlink: 279953901
date: 2022-08-28 01:23:34
---

# 写在前面

项目配置

JAVA GraalVM 17

ElasticSearch 8.3.3

Junit5 5.9.0

lombok 1.8.24

logback 1.2.11

hanlp汉语自然语言处理工具包 1.8.3

# 如何使用

## 获取hanlp语料

直接下载[data.zip](http://nlp.hankcs.com/download.php?file=data)

后续会使用到

## 本地搭建nginx网站显示静态内容

### 快速安装nginx

以我的mac为例

``` java
brew install nginx
```

然后根据安装成功的提示去找nginx.conf文件，我这里提示如下图

![安装结果](img/hanlp/967de8ea.png)

### 配置nginx

根据上图里提示去编辑nginx.conf文件

``` java
vi /opt/homebrew/etc/nginx/nginx.conf
```

编辑内容可以下面文件内容为准，当然读者也可以根据自己情况修改

``` java
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    server {
        listen       8080;
        server_name  local.wujunshen.com;

        location / {
            root   /usr/local/var/www;
            index  index.html index.htm;
        }

        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }

    include servers/*;
}
```

其中特别注意的是下面这段

``` java
    listen       8080;
    server_name  local.wujunshen.com;

    location / {
       root   /usr/local/var/www;
       index  index.html index.htm;
    }
```

首先我自定义了一个`local.wujunshen.com`
本地域名，并且和127.0.0.1绑定在一起。然后我把前述的data.zip解压到`/usr/local/var/www`目录,并让root指向它

> 提示
> `local.wujunshen.com`绑定127.0.0.1是这样的
> 我先 `vi /etc/hosts`，打开hosts文件
> 然后copy  `127.0.0.1 local.wujunshen.com`这一行到任意位置
> 最后 `source /etc/hosts`使其生效
> 这样就绑定成功了

编辑nginx.conf完成后，执行

```  java
brew services restart nginx
```

重启nginx,让其生效

### 静态网站内容验证

打开浏览器输入 `http://local.wujunshen.com:8080/`

看见下列界面，证明nginx安装成功

![nginx首页](img/hanlp/8890d509.png)

然后接着输入 `http://local.wujunshen.com:8080/data/dictionary/custom/CustomDictionary.txt` 显示如下界面

![语料](img/hanlp/6934f78b.png)

这表明nginx网站已经能显示静态内容了

## 插件安装

### 打包代码

执行

```  java
mvn clean package
```

> 注意
> 代码中的hanlp-hot-update.cfg.xml文件内容
> ```  xml
> <?xml version="1.0" encoding="UTF-8"?>
> <!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
> <properties>
>     <comment>HanLP 扩展配置</comment>
>     <!--用户可以在这里配置远程扩展字典 -->
>     <entry key="remote_ext_dict">
> http://local.wujunshen.com:8080/data/dictionary/custom/CustomDictionary.txt
>     </entry>
>     <!--用户可以在这里配置远程扩展停止词字典-->
>     <entry key="remote_ext_stopwords">
> http://local.wujunshen.com:8080/data/dictionary/stopwords.txt
>     </entry>
>     <!--用户可以在这里配置远程同义词字典-->
>     <entry key="remote_ext_synonyms">
> http://local.wujunshen.com:8080/data/dictionary/synonym/CoreSynonym.txt
>     </entry>
> </properties>
> ```
> 其中`remote_ext_dict`,`remote_ext_stopwords`和`remote_ext_synonyms`都是前述搭建的nginx网站静态内容

### 发布插件

将打包成zip格式的插件包(在/target/releases目录下)

解压到ElasticSearch下的plugins子目录下，这样就发布完成了

### 运行插件

重新启动ElasticSearch

在ElasticSearch目录下的bin子目录启动ElasticSearch

> 注意
>
> 不能用root账号启动
>
> 需要新建账号并赋权，然后启动ElasticSearch

## 查看插件执行结果

使用head插件，在“复合查询”里输入如下截图内容(事先创建了一个叫`index-test`的索引)
，并按下方“提交请求”按钮执行，可见右侧执行结果

![插件执行结果](img/hanlp//0b592194.png)

也可在命令窗口输入下列命令执行，结果和上图是一样的。

```  java
curl -H "Content-Type:application/json" -X POST -d '{
"analyzer": "hanlp_synonym",
"text": "英特纳雄耐尔"
}' http://localhost:9200/index-test/_analyze?pretty=true
```

见下图命令行执行结果

![命令行执行结果](img/hanlp/76906b5b.png)


# 开发介绍

## ES分词器简单介绍

ElasticSearch默认就有标准的英文分词器。

但是对于母语是非英语的人来说，光有英文分词器是远远不够的。

因此各国家的程序员都会开发对应自己母语的分词插件来增强ElasticSearch的分词功能

不管何种自然语言的分词器，无外乎由下列三部分组成

* 分词器（Analyzer）
* 分解器（Tokenizer）
* 词元过滤器（TokenFilter）

而底层依赖的都是分词算法。

本项目使用的分词算法是 `HanLP` ，作者何晗。

具体官网地址可见 [HanLP](https://www.hanlp.com/)，号称是最好的中文分词算法。

除此之外，分词器应该还具有一些附加功能，比如下列两个功能

* 支持用户自定义字典
* 支持字典的热更新功能

## `HanLP` 简单介绍

`HanLP` 是一系列模型与算法组成的 `NLP` (自然语言处理)
工具包，具备功能完善、性能高效、架构清晰、语料时新、可自定义特点,详情可参考 [HanLP github](https://github.com/hankcs/HanLP)
地址

选择它作为本项目底层分词算法理由如下

* Java 分词包中最流行的分词算法
* 提供多种分词器，既可基于字典也可基于分词模型
* 坚持使用明文字典，可借助社区力量对字典进行不断完善
* 开发文档和代码样例丰富

## 项目代码结构

见下图

![项目代码结构](img/hanlp/img.png)

* `assemblies`: 插件打包（`plugin.xml`）配置文件
* `com.wujunshen.core`: 分词插件核心类
* `com.wujunshen.dictionary`: 同义词字典类
* `com.wujunshen.enumation`: 涉及的枚举
* `com.wujunshen.exception`: 自定义异常
* `com.wujunshen.nature`: 自然分词属性
* `com.wujunshen.plugin`: 分词插件定义
* `com.wujunshen.update`: 热词更新处理类
* `com.wujunshen.utils`: 涉及的工具类
* `resources`: 插件属性文件所在目录。包括插件配置、`HanLP`的热词更新配置、`Java` 安全策略、`logback`
  日志配置等文件
* `test`下的`com.wujunshen.entity`和`MyAnalyzerTest`: 使用`JUnit5`编写的单元测试方法

## 单元测试类介绍

具体见 [MyAnalyzerTest.java](https://gitee.com/darkranger/hanlp-plugin/blob/master/src/test/java/com/wujunshen/core/MyAnalyzerTest.java)

其中具体说明一下私有方法 `analyze`


``` java
    private List<Token> analyze(SegmentationType segmentationType, String text) throws IOException {
        Tokens result = new Tokens();
        List<Token> resultList = new ArrayList<>();
        Analyzer analyzer = new MyAnalyzer(segmentationType);
        TokenStream tokenStream = analyzer.tokenStream("text", text);

        tokenStream.reset();

        while (tokenStream.incrementToken()) {
            CharTermAttribute charTermAttribute = tokenStream.getAttribute(CharTermAttribute.class);
            TypeAttribute typeAttribute = tokenStream.getAttribute(TypeAttribute.class);

            OffsetAttribute offsetAttribute = tokenStream.getAttribute(OffsetAttribute.class);

            PositionIncrementAttribute positionIncrementAttribute =
                    tokenStream.getAttribute(PositionIncrementAttribute.class);

            Token token = new Token();
            token.setToken(charTermAttribute.toString());
            token.setStartOffset(offsetAttribute.startOffset());
            token.setEndOffset(offsetAttribute.endOffset());
            token.setType(typeAttribute.type());
            token.setPosition(positionIncrementAttribute.getPositionIncrement());

            resultList.add(token);
        }

        tokenStream.close();

        result.setTokens(resultList);

        objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
        log.info("{}\n", objectMapper.writeValueAsString(result));

        return resultList;
    }
```

`Analyzer` 类是一个抽象类，是所有分词器基类，通过 `TokenStream` 类将文本转换为词汇单元流。

###  `TokenStream` 使用流程

1. 实例化 `TokenStream`, 向 `AttributeSource` 添加属性(词汇单元文本`text`、位置增量`position`
   、偏移量`offset`、词汇类型`type`等)
2. 调用 `reset` 方法, 将流(`stream`)重置到原始(`clean`)状态
3. 循环调用 `incrementToken` 方法，处理 `Attribute` 属性信息
4. 调用 `close` 方法释放资源

> 注意
> 由上可知 我们需要重点关注 `TokenStream` 的实例化、`reset`、`incrementToken`和`close`这几个方法实现

## 还需重点关注安全策略文件

`plugin-security.policy` 文件可见前述代码结构的图里，需要放置在 `resources` 目录下。

这样打包后才会在插件根目录下。

但是实际执行时，`ElasticSearch`的日志会报 `AccessControlException`
错误，这个可能是远程加载自定义分词字典(见`README.md`文件中所述的`nginx`静态内容网站搭建内容)
时，需要网路连接权限。

因此我在 `MyTokenizer.java` 中，加入了下列代码，如果显示正常，则说明远程加载分词字典成功

``` java
    static {
        SecurityManager sm = System.getSecurityManager();

        if (sm != null) {
            sm.checkPermission(new SpecialPermission());
        }

        AccessController.doPrivileged((PrivilegedAction<Void>) () -> {
            Nature.create("auxiliary");

            return null;
        });
        AccessController.doPrivileged((PrivilegedAction<Void>) () -> {
            nlpSegment = HanLP.newSegment()
                    // 词性标注
                    .enablePartOfSpeechTagging(true)
                    // 计算偏移量
                    .enableOffset(true)
                    // 中文人名识别
                    .enableNameRecognize(true)
                    // 日本人名识别
                    .enableJapaneseNameRecognize(true)
                    // 数量词识别
                    .enableNumberQuantifierRecognize(true)
                    // 机构名识别
                    .enableOrganizationRecognize(true)
                    // 音译人名识别
                    .enableTranslatedNameRecognize(true);

            indexSegment = HanLP.newSegment()
                    .enableIndexMode(true)
                    // 词性标注
                    .enablePartOfSpeechTagging(true)
                    // 计算偏移量
                    .enableOffset(true);

            // 在此处显示调用一下分词，使得加载词典、缓存词典的操作可以正确执行
            log.info(String.valueOf(nlpSegment.seg("HanLP中文分词工具包！")));
            log.info(String.valueOf(indexSegment.seg("HanLP中文分词工具包！")));

            return null;
        });
    }
```

## 总结

本项目功能可总结为下列这些

* 内置3种分词模式，适合不同场景(索引分词、nlp分词、同义词索引分词)
* 支持外置字典(需要搭建`nginx`静态内容网站)
* 支持分词器级别的自定义字典
* 支持远程字典热更新

# 参考资料

1. [项目源码](https://gitee.com/darkranger/hanlp-plugin)

# 特别感谢

本项目单元测试类 [MyAnalyzerTest.java](https://gitee.com/darkranger/hanlp-plugin/blob/master/src/test/java/com/wujunshen/core/MyAnalyzerTest.java)
所使用的文本解析内容，来源于倪匡老先生的小说: 卫斯理系列中的《透明光》第一章

老先生的具体生平可见 [百度百科](https://baike.baidu.com/item/%E5%80%AA%E5%8C%A1/333092)

向刚去世不久的倪匡老先生致以崇高的敬意~

# **R.I.P**
