---
title: Graalvm安装
excerpt: Graalvm安装笔记
categories:
  - Quarkus
tags:
  - Quarkus
  - Graalvm
comments: true
layout: post
index_img: /img/milan/13.png
sticky: 9999
abbrlink: 877356228
date: 2022-06-22 08:09:51
---

# graalvm

## 下载

从下面链接 https://github.com/graalvm/graalvm-ce-builds/releases 下载

我的电脑 `macOS` (`aarch64/M1`)且已安装java17


java17

https://github.com/graalvm/graalvm-ce-builds/releases/download/vm-22.1.0/graalvm-ce-java17-darwin-aarch64-22.1.0.tar.gz


If you are using macOS Catalina and later you may need to remove the quarantine attribute from the bits before you can use them
To do this, run the following:

``` shell
sudo xattr -r -d com.apple.quarantine path/to/graalvm/folder/
``` 

## 安装

迁移到java安装目录，并设置`JAVA_HOME`

``` shell
sudo mv graalvm-ce-java17-22.1.0 /Library/Java/JavaVirtualMachines

export PATH=/Library/Java/JavaVirtualMachines/graalvm-ce-java17-22.1.0/Contents/Home/bin:$PATH

export JAVA_HOME=/Library/Java/JavaVirtualMachines/graalvm-ce-java17-22.1.0/Contents/Home
``` 

## 验证

To check whether the installation was successful, run the `java -version` command.


# native-image

## 下载
java17

https://github.com/graalvm/graalvm-ce-builds/releases/download/vm-22.1.0/native-image-installable-svm-java17-darwin-aarch64-22.1.0.jar

``` shell
sudo mv native-image-installable-svm-java17-darwin-aarch64-22.1.0.jar /Library/Java/JavaVirtualMachines/
sudo gu install -L native-image*
``` 

## 制作快捷路径

``` shell
vi /usr/local/bin/native-image
```

加入以下内容
``` shell
oldJH=$JAVA_HOME
JAVA_HOME=/Library/Java/JavaVirtualMachines/graalvm-ce-java17-22.1.0/Contents/Home
oldPath=$PATH
PATH=$JAVA_HOME/bin:$PATH
native-image $*
JAVA_HOME=$oldJH
PATH=$oldPATH
```

然后赋权
``` shell
chmod +x /usr/local/bin/native-image
```

## 验证

随便哪个目录输入`native-image --help` ,出现下图所示即安装成功

![安装成功](img/graalvm/1.png)




