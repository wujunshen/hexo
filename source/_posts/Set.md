---
title: Set
excerpt: 数据结构-Set
categories:
  - 算法
tags:
  - 算法
  - 数据结构
  - Set
comments: true
layout: post
index_img: /img/jetbrain/1920x1080-hub2022_1.png
abbrlink: 3730400060
date: 2022-05-30 09:58:03
sticky: 886
---
# 概念

继承于`Collection`接口，是一个不允许出现重复元素且无序的集合，主要包括`HashSet`和`TreeSet`两个实现类

判断重复元素时，`HashSet`调用`hashCode()`和`equal()`方法实现；`TreeSet`调用`compareTo`方法实现

# HashSet

用来存储没有重复元素的集合类，且无序。实现`Set`接口。底层使用机制就是`HashMap`（见[HashMap](1029785637.html)章节），所以也是线程不安全的

见源码（java11）

``` java
//定义了HashMap类型的成员变量，拥有HashMap所有属性
private transient HashMap<E,Object> map;
```

## 特点

* 不可重复
* 无序
* 线程不安全
* 集合元素可以为`null`，但只能放一个`null`
* 使用场景: 去重、不要求顺序

## 原理

底层使用`HashMap`的`key`不能重复机制来实现没有重复的`HashSet`

## 数据结构

哈希表结构，主要利用`HashMap`的`key`来存储元素，计算插入元素的`hashCode`值来获取元素在集合中的位置

# TreeSet

`TreeSet`实现了`SortedSet`接口，意味着可以排序，它是一个有序并且没有重复的集合类，底层是通过`TreeMap`实现。`TreeSet`并不是根据插入的顺序来排序，而是字典自然排序。线程不安全

`TreeSet`支持两种排序方式: 自然升序排序和自定义排序。

## 特点

* 不可重复
* 有序，默认自然升序排序
* 线程不安全
* 集合元素不可以为`null`

## 原理

`TreeSet`底层基于`treeMap`（红黑树结构）实现，可自定义比较器对元素进行排序，或是使用元素的自然顺序

使用场景: 去重、要求排序

## 数据结构

红黑树结构，每个元素都是树中的一个节点，插入的元素都会进行排序

# LinkedHashSet
`LinkedHashSet`使用`HashSet`机制实现，是一个可保证插入顺序或访问顺序，且没有重复的集合类。线程不安全

数据结构: 数组+双向链表
`Entry`结构: `before|hash|key|value|next|after`，`before`和`after`用于维护整个双向链表。

## 特点

* 集合元素不可以为`null`
* 线程不安全

## 原理

`LinkedHashSet`底层使用了`LinkedHashMap`机制(比如`before`和`after`),加上又继承了`HashSet`，所以可实现既可以保证迭代顺序，又可以达到不出现重复元素

使用场景: 去重、需要保证插入或者访问顺序

# HashSet、TreeSet、LinkedHashSet的区别

`HashSet`只去重，`TreeSet`去重且排序，`LinkedHashSet`去重且保证迭代顺序
