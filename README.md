# self-pdf
pdf demo

手动分页+jsPdf.js实现
本文的实现是在阐述叶慎大佬的PDF实现demo解读
PageRender 使用说明 
前端html转pdf技术点（基于jsPDF和html2canvas） 
# 一、整体概览
PageRender.js原文整体解释
1. 参数设置
检查参数，导入pdf.js
2. 拷贝元素
将要导出pdf的元素clone一份出来
3. 图片转base64
     将图片下载下来，转化成base64，便于后续渲染。【为何要下载转成base64多此一举呢？直接在canvas中使用img存在跨域等不安全问题】
4. 分页-比较关键
- 深度优先遍历将页面中的所有元素放到待排版的数组中
- 创建空页面中，尝试将待排版数组中的元素取出放置到空页面中，每次放置一次都判断一次当前空页面的高度是否超出最大值
- 没有超过则继续添加。直到超过最大高度则回退放入的元素，开始下一页创建
5. 渲染
将dom转换为svg-`foreignObject`
```javascript
    function htmlToSvg(htmlString, width, height) {
        var container = document.createElement("div");
        container.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
<foreignObject x="0" y="0" width="${width}" height="${height}" >${htmlString}</foreignObject>
</svg>
`;
        var svg = container.children[0];
        return svg;
    }
```
将页面转换成图片
```javascript

_img.addEventListener("load", function () {
                var cvs = document.createElement("canvas");
                var ctx = cvs.getContext("2d");
                cvs.width = width;
                cvs.height = height;
                ctx.drawImage(_img, 0, 0, _img.width, _img.height, 0, 0, width, height);
                var newImg = document.createElement("img");
                try {
                    // 字节的webview中不支持这个方法
                    newImg.src = cvs.toDataURL('image/png');
                } catch (err) {
                    rej({
                        code: 1,
                        message: "您当前的系统不支持将题目导出为PDF"
                    });
                }
                res(newImg);
            });


_img.src = "data:image/svg+xml;charset=utf-8," + (new XMLSerializer()).serializeToString(svg)
                .replace(/\r\n/g, '%0A').replace(/\r/g, '%0A').replace(/\n/g, '%0A')
                .replace(/\#/g, '%23').replace(/\?/g, '%3F').replace(/\&/g, '%26');

```

6. 完成
使用pdf.js创建PDF对象，将每页的图片添加到pdf的页面中
```javascript
    function imgPackPdf(imgs) {
        var pageW = 595.28;
        var pageH = 841.89;
        var doc = new jsPDF({
            unit: 'pt',
            format: 'a4',
            compress: true
        });
        doc.deletePage(1);
        imgs.forEach(function (img, idx) {
            doc.addPage();
            doc.addImage(img, '', 0, 0, pageW, pageH, "", "SLOW");
        });
        return doc;
    }
```

7. 异常
返回异常

# 二、关键技术点
1. canvas生成图片 toDataURL
2. dom变成图片，此处使用的是svg的foreignObject+canvas【当然这个也可使用html2canvas】
3. jspdf的使用
4. css分页实现
```javascript

// 设置元素保持整体不被分割
break-before: page;

// 强制换页实现
page-break-before: always;
```

# 三、TODO
1. 翻译成ts版本，发布到npm源
2. 优化中间的多次clone和强制渲染过程

# 四、参考

https://developer.mozilla.org/zh-CN/docs/Web/CSS/break-before
