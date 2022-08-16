---
title: ElasticSearch插件开发示例
excerpt: ES相关
categories:
  - 中间件
tags:
  - 中间件
  - ElasticSearch
  - GraalVM
comments: true
layout: post
index_img: /img/milan/18.png
sticky: 101
abbrlink: 2158921611
date: 2022-08-16 15:31:01
---

# 写在前面

项目配置

[JAVA GraalVM 17](http://www.wujunshen.cn/posts/877356228.html)

ElasticSearch 8.3.3

# 插件开发目的

让更多的开发者增强ElasticSearch功能

# 插件类型

| 类型               | 用途                        |
|:-----------------|:--------------------------|
| ActionPlugin     | rest命令请求，定制化符合自身需求的rest命令 |
| AnalysisPlugin   | 分析，弥补es自身分析功能不足           | 
| ClusterPlugin    | 集群                        |
| DiscoveryPlugin  | 发现                        | 
| IngestPlugin     | 预处理                       | 
| MapperPlugin     | 映射，增加强es数据类型              | 
| NetworkPlugin    | 网络                        | 
| RepositoryPlugin | 存储，提供快照和恢复                | 
| ScriptPlugin     | 脚本，调用任何语言写的自定义脚本          | 
| SearchPlugin     | 查询，扩展es本身的查询功能            | 

表格中插件类型都是java接口类，具体可见github上ElasticSearch的[源码](https://github.com/elastic/elasticsearch/tree/main/server/src/main/java/org/elasticsearch/plugins)

# 插件开发举例

## 自定义开发插件类路径

见下图

![开发目录结构](img/es/304aee05.png)

## 开发步骤

### 新建plugin-descriptor.properties

在reousrces目录下新建plugin-descriptor.properties，内容如下

``` properties
name=${elasticsearch.plugin.name}
version=${project.version}
description=${project.description}
classname=${elasticsearch.plugin.classname}
java.version=${maven.compiler.target}
elasticsearch.version=${elasticsearch.version}
```

properties文件中各属性含义见下列表格

| 属性                    | 描述              |
|:----------------------|:----------------|
| name                  | 插件名字            | 
| version               | 插件版本            | 
| description           | 插件功能描述          | 
| classname             | 插件入口class，完整路径  | 
| java.version          | jdk版本           | 
| elasticsearch.version | elasticsearch版本 | 

### 定义pom文件，绑定properties中的配置项

properties中的配置项值在pom.xml文件中定义。如下

``` xml
...
<properties>
    <elasticsearch.plugin.name>plugin develop</elasticsearch.plugin.name>
    <elasticsearch.plugin.classname>com.wujunshen.plugin.PrintPlugin</elasticsearch.plugin.classname>
    <maven.compiler.target>17</maven.compiler.target>
    <elasticsearch.version>8.3.3</elasticsearch.version>
    <elasticsearch.assembly.descriptor>${project.basedir}/src/main/assemblies/plugin.xml
        </elasticsearch.assembly.descriptor>
</properties>
...
```

> 注意
>
> 其中elasticsearch.version配置项的值
>
> 也就是ElasticSearch的版本号必须和你将要发布插件包的ElasticSearch安装版本号一致。
>
> 上述我写了8.3.3，打包后也必须解压到8.3.3版本的ElasticSearch中，否则插件执行效果会无效化

### 自定义plugin类型类

假设我们自定义的插件类型是ActionPlugin，则自定义一个plugin类型类，继承抽象类Plugin，然后实现ActionPlugin接口

代码示例

``` java
package com.wujunshen.plugin;

import com.wujunshen.plugin.handler.PrintPluginHandler;

import org.elasticsearch.cluster.metadata.IndexNameExpressionResolver;
import org.elasticsearch.cluster.node.DiscoveryNodes;
import org.elasticsearch.common.settings.ClusterSettings;
import org.elasticsearch.common.settings.IndexScopedSettings;
import org.elasticsearch.common.settings.Settings;
import org.elasticsearch.common.settings.SettingsFilter;
import org.elasticsearch.plugins.ActionPlugin;
import org.elasticsearch.plugins.Plugin;
import org.elasticsearch.rest.RestController;
import org.elasticsearch.rest.RestHandler;

import java.util.Collections;
import java.util.List;
import java.util.function.Supplier;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class PrintPlugin extends Plugin implements ActionPlugin {
    private static final String ACTION_PREFIX = "print";

    public PrintPlugin() {
        super();
        log.info("{} 插件实例化......", ACTION_PREFIX);
    }

    @Override
    public List<RestHandler> getRestHandlers(Settings settings, RestController restController,
                                             ClusterSettings clusterSettings, IndexScopedSettings indexScopedSettings
            , SettingsFilter settingsFilter, IndexNameExpressionResolver indexNameExpressionResolver,
                                             Supplier<DiscoveryNodes> nodesInCluster) {
        return Collections.singletonList(new PrintPluginHandler(restController));
    }
}
```

### 实现具体handler类

ElasticSearch插件真正要做的事情，需要实现的逻辑我们放在具体的handler类中，比如这个例子中，我们实现一个PrintPluginHandler类，打印消耗时间，请求参数，插件名等一些信息

``` java
package com.wujunshen.plugin.handler;

import org.elasticsearch.client.internal.node.NodeClient;
import org.elasticsearch.common.inject.Inject;
import org.elasticsearch.rest.BaseRestHandler;
import org.elasticsearch.rest.BytesRestResponse;
import org.elasticsearch.rest.RestController;
import org.elasticsearch.rest.RestRequest;
import org.elasticsearch.rest.RestRequest.Method;
import org.elasticsearch.rest.RestStatus;
import org.elasticsearch.xcontent.XContentBuilder;

import java.io.IOException;
import java.util.Date;
import java.util.List;

import lombok.extern.slf4j.Slf4j;

/**
 * @author wujunshen
 */
@Slf4j
public class PrintPluginHandler extends BaseRestHandler {
    private static final String PRINT_NAME = "printPluginTest";

    @Inject
    public PrintPluginHandler(RestController restController) {
        super();

        // 注册
        restController.registerHandler(new Route(Method.GET, "/print-plugin"), this);
    }

    @Override
    public String getName() {
        return PRINT_NAME;
    }

    /**
     *
     */
    @Override
    public List<Route> routes() {
        return List.of(new Route(Method.GET, "print"));
    }

    /**
     * 处理业务逻辑
     */
    @Override
    protected RestChannelConsumer prepareRequest(RestRequest request, NodeClient client) throws IOException {
        // 接收的参数
        log.info("params=={}", request.params());

        long startTime = System.currentTimeMillis();
        String name = request.param("name");
        long cost = System.currentTimeMillis() - startTime;

        // 返回内容，这里返回消耗时间 请求参数 插件名称
        return channel -> {
            XContentBuilder builder = channel.newBuilder();
            builder.startObject();
            builder.field("cost", cost);
            builder.field("name", name);
            builder.field("time", new Date());
            builder.field("pluginName", PRINT_NAME);
            builder.field("print", "this is print plugin test");
            builder.endObject();
            channel.sendResponse(new BytesRestResponse(RestStatus.OK, builder));
        };
    }
}
```

通过上述4步，我们完成了插件开发过程，接下来需要发布，使其生效

# 发布插件

## 插件配置文件定义
首先在assemblies目录下新建plugin.xml中，配置好打包需要的各项属性，如下

``` xml
<?xml version="1.0"?>
<assembly>
    <id>plugin-develop</id>
    <formats>
        <format>zip</format>
    </formats>
    <includeBaseDirectory>false</includeBaseDirectory>
    <fileSets>
        <fileSet>
            <directory>${project.basedir}/config</directory>
            <outputDirectory>config</outputDirectory>
        </fileSet>
    </fileSets>

    <files>
        <file>
            <source>${project.basedir}/src/main/resources/plugin-descriptor.properties</source>
            <outputDirectory/>
            <filtered>true</filtered>
        </file>
    </files>
    <dependencySets>
        <dependencySet>
            <outputDirectory/>
            <useProjectArtifact>true</useProjectArtifact>
            <useTransitiveFiltering>true</useTransitiveFiltering>
            <excludes>
                <exclude>org.elasticsearch:elasticsearch</exclude>
            </excludes>
        </dependencySet>
        <dependencySet>
            <outputDirectory/>
            <useProjectArtifact>true</useProjectArtifact>
            <useTransitiveFiltering>true</useTransitiveFiltering>
            <includes>
                <include>org.apache.httpcomponents:httpclient</include>
            </includes>
        </dependencySet>
    </dependencySets>
</assembly>
```

指定了打包成zip格式，并把需要打入插件包的依赖包和文件全部做好了声明。接下来我们就可以执行maven打包命令进行打包

## maven命令打包

在maven的pom.xml中定义好build步骤
``` xml
。。。
    <properties>
        <project.encoding>UTF-8</project.encoding>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <project.reporting.outputEncoding>UTF-8</project.reporting.outputEncoding>
        <java.source.version>17</java.source.version>
        <java.target.version>17</java.target.version>
        <elasticsearch.version>8.3.3</elasticsearch.version>
        <maven.compiler.target>17</maven.compiler.target>
        <elasticsearch.assembly.descriptor>${project.basedir}/src/main/assemblies/plugin.xml
        </elasticsearch.assembly.descriptor>
        <elasticsearch.plugin.name>plugin develop</elasticsearch.plugin.name>
        <elasticsearch.plugin.classname>com.wujunshen.plugin.PrintPlugin</elasticsearch.plugin.classname>
    </properties>
。。。
    <build>
        <resources>
            <resource>
                <directory>src/main/resources</directory>
                <filtering>false</filtering>
                <excludes>
                    <exclude>*.properties</exclude>
                </excludes>
            </resource>
        </resources>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-assembly-plugin</artifactId>
                <version>2.6</version>
                <configuration>
                    <appendAssemblyId>false</appendAssemblyId>
                    <outputDirectory>${project.build.directory}/releases/</outputDirectory>
                    <descriptors>
                        <descriptor>${basedir}/src/main/assemblies/plugin.xml</descriptor>
                    </descriptors>
                </configuration>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals>
                            <goal>single</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.8.1</version>
                <configuration>
                    <source>${maven.compiler.target}</source>
                    <target>${maven.compiler.target}</target>
                    <encoding>${project.build.sourceEncoding}</encoding>
                </configuration>
            </plugin>
        </plugins>
    </build>
。。。
```
通过maven命令
``` shell
mvn clean install
```

打包已开发完成的源码。

## 发布插件包

将打包成zip格式的插件包(在/target/releases目录下)

解压到ElasticSearch下的plugins子目录下，这样就发布完成了

# 运行插件

## 启动ElasticSearch

在ElasticSearch目录下的bin子目录启动ElasticSearch

> 注意
>
> 不能用root账号启动
>
> 需要新建账号并赋权，然后启动ElasticSearch

## 查看效果

浏览器中输入  `http://127.0.0.1:9200/print-plugin?name=wujunshen`

效果如下

![效果图](img/es/251f4c4e.png)

以上这些内容即我们开发一个ElasticSearch插件包的完整示例

# 参考资料

1. [本文源码](https://gitee.com/darkranger/elasticsearch-plugin-devlop-example)
