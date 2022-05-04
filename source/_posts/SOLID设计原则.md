---
title: SOLID设计原则
excerpt: 设计模式
categories:
- 设计模式
tags:
- 设计模式
comments: true
layout: post
index_img: /img/jetbrain/1920x1080-fleet2022_1.png
---

面向对象的设计原则也被称为SOLID。SOLID最初是由Robert C.Martin所提出的，是敏捷软件开发过程的一部分。SOLID原则包括单一职责原则（S）、开闭原则（O）、里氏替换原则（L）、接口隔离原则（I）和依赖倒置原则（D）

## 单一职责原则（Single responsibility principle）

该原则指出软件模块应该只有一个被修改的理由。在大多数情况下，编写Java代码时都会将单一职责原则应用于类。单一职责原则可被视为使封装工作达到最佳状态的良好实践。
更改的理由是：需要修改代码。如果类需要更改的原因不止一个，那么每个类都可能引入影响其他类的更改。当这些更改单独管理但影响同一模块时，一系列更改可能会破坏与其他更改原因相关的功能。
另一方面，每个更改的职责/理由都会增加新的依赖关系，使代码不那么健壮，更难以修改

举例假设有个Car类，既有数据库封装API，又包含业务逻辑计算。如图

![before](img/solid/AFEACDCA09A8139FA6C1FDEBE790148F.jpg)

create、update、delete、read方法都是数据库封装API，而calculatePrice是个业务逻辑计算API，因此如果更改了数据库，必须也要更改Car代码，这可能会在Car逻辑中产生错误

解决方案是创建两个类: 一个用于封装Car逻辑，另一个用于负责数据库封装

![after](img/solid/A395F4EFDE87F281C96D195CAE2D504C.jpg)

## 开闭原则（Open Closed Principle）

“模块、类和函数应该对扩展开放，对修改关闭”

一旦开发并测试了一个模块，如果想要改变它，不仅要测试正在改变的功能，还要测试它负责的整个功能。这涉及到许多额外的资源，这些资源可能从一开始就没有估算过，也会带来额外的风险。一个模块中的更改可能会影响其他模块或整体上的功能

最好的办法是尝试在完成后保持模块不变，并通过**继承**和**多态**来扩展添加新功能。开闭原则是最重要的设计原则之一，是大多数设计模式的基础

## 里氏替换原则（Liskov Substitution Principle）

Barbara Liskov指出，派生类型必须完全可替代其基类型。里氏替换原则（LSP）与子类型多态密切相关。基于面向对象语言中的子类型多态，派生对象可以用其父类型替换。

比如Car对象，它可以在代码中用作Vehicle

在设计模块和类时，必须确保派生类型从行为的角度来看是可替代的。当派生类型被其父类型替换时，其余代码就像它是子类型那样使用它。从这个角度来看，派生类型应该像其父类型那样表现，不应该破坏它的行为。这称之为强行为子类型

## 接口隔离原则（Interface Segregation Principle）

下面这句话从链接 [https://www.oodesign.com/interface-segregation-principle.html](https://www.oodesign.com/interface-segregation-principle.html) 得来“客户端不应该依赖于它所不需要的接口”

接口隔离原则减少了代码耦合，使软件更健壮，更易于维护和扩展。接口隔离原则最初是由Robert Martin提出的，他意识到如果接口隔离原则被破坏，客户端被迫依赖它们不使用的接口时，代码就会变得紧密耦合，几乎不可能为其添加新功能

举例说明，如图
![before](img/solid/431F4B90578FD26B57932B410F54D054.jpg)

实现一个名为Mechanic（机修工）的类。机修工修理汽车，所以我们增加了修理汽车的方法。在这个例子中，Mechanic类依赖于ICar类，但是，Car类提供的方法超出了Mechanic需要的。Car类的sell方法应该属于汽车销售人员使用的方法，机修工类并不需要这个sell方法。因此ICar接口需要分成两个接口，给机修工使用的接口只要repair方法

![after](img/solid/0631ED924A2697CE158BC2E9B2E66229.jpg)

## 依赖倒置原则（Dependence Inversion Principle）

“高级模块不应该依赖低级模块，两者都应该依赖抽象”

“抽象不应该依赖于细节，细节应该依赖于抽象”

这里需要解释耦合的概念
* 耦合是指软件系统的模块彼此依赖的程度。依赖度越低，维护和扩展系统就越容易

有不同的方法来解耦系统的组件。其中一个办法是将高级逻辑与低级模块分开，如图

![依赖倒置](img/solid/727DC3888F809870567CC3A34F18F9EC.jpg)

这样做时，可尝试让它们都依赖于抽象进而减少二者之间的依赖关系。如此就可替换或扩展其中任何一个模块而不影响其他模块

## 参考资料

1.[Interface Segregation Principle (ISP)](https://www.oodesign.com/interface-segregation-principle.html)
