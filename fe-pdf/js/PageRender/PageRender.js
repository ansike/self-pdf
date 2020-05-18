var PageRender;

(function () {

    var blankImgSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII=";

    //加载其他需要资源
    (function () {

        var currentSrc = document.currentScript.src;
        var currentPath = currentSrc.split("#")[0].split("?")[0].split("/").slice(0, -1).join("/") + "/";

        //jspdf
        var r_script_jspdf = document.createElement("script");
        r_script_jspdf.src = currentPath + "_jspdf.min.js";
        document.getElementsByTagName("head")[0].appendChild(r_script_jspdf);

    })();

    /////////////////////////////

    PageRender = {};
    PageRender.render = render;
    window.PageRender = PageRender;
    var configDataDefault = {
        //不接受外部设置的参数
        page_w: 794,
        page_h: 1123,
        pdfFileName: "questions.pdf",

        //版式
        paddingLeft: "45px",
        paddingRight: "45px",
        paddingTop: "60px",
        paddingBottom: "60px",
        fontFamily: "calibri,'Times New Roman',SimHei",
        fontSize: "14px",

        //输出
        definitionRatio: 3,
        outputPdfData: true
    };

    /////////////////////////////

    function render(elems, style, configData) {
        elems = Array.from(elems);
        var resHandler = null,
            rejHandler = null;
        var pages = [];
        // 存放页面图片数组
        var pageImages = [];

        new Promise(function (_res, _rej) {
            _res();
        })

            /////////////////
            //参数设置
            .then(function () {
                return new Promise(function (_res, _rej) {

                    //configData
                    if (typeof configData !== "object") configData = {};
                    checkSizeValue.call(configData, "paddingLeft", "px|pt|mm|cm|%");
                    checkSizeValue.call(configData, "paddingRight", "px|pt|mm|cm|%");
                    checkSizeValue.call(configData, "paddingTop", "px|pt|mm|cm|%");
                    checkSizeValue.call(configData, "paddingBottom", "px|pt|mm|cm|%");
                    checkSizeValue.call(configData, "fontSize", "px|pt|mm|cm");
                    if (typeof configData.fontFamily !== "string") delete configData.fontFamily;
                    if (typeof configData.definitionRatio !== "number") delete configData.definitionRatio;
                    if (typeof configData.outputPdfData !== "boolean") delete configData.outputPdfData;
                    configData = Object.assign(JSON.parse(JSON.stringify(configDataDefault)), configData);

                    //styles
                    if (typeof style !== "string") style = "";

                    //检查jsPdf是否导入
                    setInterval(function () {
                        if (typeof jsPDF === "function") _res();
                    }, 30);
                });
            })

            /////////////////
            //拷贝元素
            .then(function () {
                return new Promise(function (_res, _rej) {
                    var _elems = [];
                    elems.forEach(function (val, idx, arr) {
                        _elems.push(val.cloneNode(true));
                    });
                    elems = _elems;
                    _res();
                });
            })

            /////////////////
            //图片转base64
            .then(function () {
                return new Promise(function (_res, _rej) {

                    filtImage(elems, configData.definitionRatio)

                        .then(function (failedImgList) {
                            _res();
                        });

                });
            })

            /////////////////
            //分页
            .then(function () {
                return new Promise(function (_res, _rej) {

                    paginate(elems, style, configData)

                        .then(function (_pages) {
                            pages = _pages;
                            _res();
                        });

                });
            })


            /////////////////
            //渲染
            .then(function () {
                return new Promise(function (_res, _rej) {

                    var promiseList = [];
                    console.log("渲染", pages)
                    pages.forEach(function (val, idx, arr) {
                        var thisPromise = render_page(val.outerHTML, configData);
                        thisPromise.then(function (img) {
                            pageImages[idx] = img;
                        }).catch(function (err) {
                            _rej(err);
                        });
                        promiseList.push(thisPromise);
                    });

                    Promise.all(promiseList).then(function () {
                        setTimeout(function () {
                            _res();
                        }, 0);
                    });

                });
            })


            /////////////////
            //完成
            .then(function () {
                return new Promise(function (_res, _rej) {
                    var pdfDataUrl = null,
                        pdfArrayBuffer = null,
                        pdfBlob = null;

                    if (configData.outputPdfData) {
                        var pdf = imgPackPdf(pageImages);
                        pdfDataUrl = pdf.output("dataurlstring", {
                            filename: configData.pdfFileName
                        });
                        pdfArrayBuffer = pdf.output("arraybuffer", {
                            filename: configData.pdfFileName
                        });
                        pdfBlob = pdf.output("blob", {
                            filename: configData.pdfFileName
                        });
                        objectUrl = URL.createObjectURL(pdfBlob);
                    }

                    resHandler({
                        images: pageImages,
                        pdfDataUrl: pdfDataUrl,
                        pdfArrayBuffer: pdfArrayBuffer,
                        pdfBlob: pdfBlob,
                        objectUrl
                    });
                });
            })

            //////////////////
            //异常
            .catch(function (err) {
                rejHandler({
                    code: err.code,
                    message: err.message
                });
            });




        //
        return new Promise(function (res, rej) {
            resHandler = res;
            rejHandler = rej;
        });
    }

    //////////////////////////////////////////////////////////////////////////////////////////

    //checkSizeValue.call
    function checkSizeValue(key, units) {
        if (typeof this[key] === "string" && this[key].match(new RegExp(`^\\d{1,}(?:${units})$`, "g"))) {
            //
        } else {
            delete this[key];
        }
    }

    //过滤图片
    function filtImage(elems, definitionRatio) {
        return new Promise(function (res, rej) {
            var promiseList = [];
            var failedImgList = [];
            var container = document.createElement("div");
            elems.forEach(function (val, idx, arr) {
                container.appendChild(val);
            });
            //
            var imgs = container.querySelectorAll("img");
            imgs.forEach(function (val, idx, arr) {
                var thisPromise = drawImage(val, definitionRatio);
                promiseList.push(thisPromise);
                thisPromise.then(function (newImg) {
                    val.src = newImg.src;
                    val.width = newImg.width;
                    val.height = newImg.height;
                }).catch(function (newImg) {
                    val.setAttribute("src_reserve", val.getAttribute("src"));
                    val.src = newImg.src;
                    val.width = newImg.width;
                    val.height = newImg.height;
                    val.style.border = "1px solid rgba(0,0,0,0.3)";
                    val.style.boxSizing = "border-box";
                    failedImgList.push(val);
                });
            });
            //
            Promise.all(promiseList).then(function () {
                setTimeout(function () {
                    res();
                }, 0);
            }).catch(function () {
                setTimeout(function () {
                    res(failedImgList);
                }, 0);
            });
        });
    }

    //绘图
    function drawImage(img, definitionRatio) {
        return new Promise(function (res, rej) {
            var _img = document.createElement("img");
            var mWidth = img.getAttribute("width"),
                mHeight = img.getAttribute("height");

            _img.addEventListener("load", function () {
                var oWidth = _img.naturalWidth,
                    oHeight = _img.naturalHeight;

                var cvs = document.createElement("canvas");
                var ctx = cvs.getContext("2d");
                cvs.width = oWidth * definitionRatio;
                cvs.height = oHeight * definitionRatio;
                var dataUrl, fail = false;
                try {
                    ctx.drawImage(_img, 0, 0, _img.naturalWidth, _img.naturalHeight, 0, 0, cvs.width, cvs.height);
                    dataUrl = cvs.toDataURL('image/png');
                } catch (err) {
                    dataUrl = blankImgSrc;
                    fail = true;
                }

                var newImg = document.createElement("img");
                newImg.src = dataUrl;

                if (typeof mWidth === "string") _img.width = mWidth * 1;
                if (typeof mHeight === "string") _img.height = mHeight * 1;
                var addToDomHandler = addToDom(_img);
                newImg.width = _img.width;
                newImg.height = _img.height;
                addToDomHandler.remove();

                if (fail) {
                    rej(newImg);
                } else {
                    res(newImg);
                }
            });

            _img.addEventListener("error", function (err) {
                _img.removeAttribute("crossOrigin");
                _img.src = img.src;
            });

            _img.crossOrigin = 'anonymous';
            _img.src = img.src;
        });
    }

    //分页
    function paginate(elems, style, configData) {
        var pages = [];
        var paginateUnits = splitAsUnit(elems);
        /*
         */
        return new Promise(function (res, rej) {
            elems.forEach(function (val, idx, arr) {
                val.isRoot = true;
            });
            //
            while (paginateUnits.length > 0) {
                paginateNextPage();
            }

            ////
            if (pages.length === 0) {
                pages.push(createPage("", style, configData));
            }
            ///
            res(pages);
        });

        //元素拆分成基本排版单元
        function splitAsUnit(elemList) {
            var paginateUnits = [];
            elemList.forEach(function (val, idx, arr) {
                processElem(val);
            });
            console.log('splitAsUnit', paginateUnits)
            return paginateUnits;

            //////////////
            function processElem(elem) {
                if (elem.nodeType !== 3 && elem.nodeType !== 1) return;
                //文本节点
                if (elem.nodeType === 3) {
                    let chars = elem.nodeValue.split("");
                    chars.forEach(function (val, idx, arr) {
                        paginateUnits.push({
                            isChar: true,
                            char: val,
                            parentNode: elem
                        });
                    });
                }
                //标识为整体的元素或无子节点的元素
                else if (typeof elem.getAttribute("page-unitary") === "string" || elem.childNodes.length === 0) {
                    paginateUnits.push(elem);
                }
                //有子节点元素
                else {
                    var children = Array.from(elem.childNodes);
                    children.forEach(function (val, idx, arr) {
                        processElem(val);
                    });
                }
            }

        }

        //生成单页
        function paginateNextPage() {
            var thisPage = createPage("", style, configData);
            var content = thisPage.querySelector(".page_contentWrapper");
            var markedElems = [];
            var addToIframeHandler = addToIframe(thisPage);
            var maxHeight = thisPage.querySelector(".page_contentSizeRuler").offsetHeight;
            var lastHeight = content.offsetHeight;
            //
            if (paginateUnits.length > 0) {
                appendOneUnit();
                lastHeight = content.offsetHeight;
            }
            var allowNext = true;
            while (allowNext && paginateUnits.length > 0) {
                allowNext = appendNextUnitAndCheck();
            }
            //
            // addToIframeHandler.remove();
            pages.push(thisPage);
            clearMarkedElems();
            return allowNext;

            //添加一个paginateUnits
            function appendOneUnit() {
                var thisUnit = paginateUnits.splice(0, 1)[0];
                appendUnit(thisUnit);
            }
            //尝试添加一个paginateUnits
            function appendNextUnitAndCheck() {
                var thisUnit = paginateUnits.splice(0, 1)[0];
                var result = true;
                //

                appendUnit(thisUnit);
                //
                var currentHeight = content.offsetHeight;
                if (currentHeight > lastHeight && currentHeight > maxHeight) {
                    result = false;
                    paginateUnits.unshift(thisUnit);
                    undoUnit(thisUnit);
                }
                lastHeight = currentHeight;
                return result;
            }
            //清空所有元素的指向拷贝元素标记
            function clearMarkedElems() {
                markedElems.forEach(function (val, idx, arr) {
                    delete val.copyElement;
                });
            }

            ////////////////
            //添加元素
            function appendUnit(unit) {
                var copyParentNode, selfCopy, toAppendElem;
                //本节点内容处理
                if (unit.isChar) {
                    copyParentNode = getCopyElement(unit.parentNode);
                    copyParentNode.nodeValue += unit.char;
                    toAppendElem = unit.parentNode;
                } else {
                    toAppendElem = unit;
                }
                //递归添加
                while (toAppendElem) {
                    selfCopy = getCopyElement(toAppendElem);
                    //是根节点
                    if (toAppendElem.isRoot) {
                        if (!selfCopy.parentNode) {
                            content.appendChild(selfCopy);
                        }
                        toAppendElem = null;
                    }
                    //不是根节点
                    else {
                        copyParentNode = getCopyElement(toAppendElem.parentNode);
                        if (!selfCopy.parentNode) {
                            copyParentNode.appendChild(selfCopy);
                        }
                        toAppendElem = toAppendElem.parentNode;
                    }
                }
            }
            //移除元素
            function undoUnit(unit) {
                //本节点内容处理
                if (unit.isChar) {
                    copyParentNode = getCopyElement(unit.parentNode);
                    copyParentNode.nodeValue = copyParentNode.nodeValue.slice(0, -1);
                    if (copyParentNode.nodeValue === "") {
                        toUndoElem = unit.parentNode;
                    }
                } else {
                    toUndoElem = unit;
                }
                //递归移除
                while (toUndoElem) {
                    selfCopy = getCopyElement(toUndoElem);
                    //是根节点
                    if (toUndoElem.isRoot) {
                        if (selfCopy.parentNode) {
                            content.removeChild(selfCopy);
                        }
                        toUndoElem = null;
                    }
                    //不是根节点
                    else {
                        copyParentNode = getCopyElement(toUndoElem.parentNode);
                        if (selfCopy.parentNode) {
                            copyParentNode.removeChild(selfCopy);
                        }
                        if (Array.from(copyParentNode.childNodes).length === 0) {
                            toUndoElem = toUndoElem.parentNode;
                        } else {
                            toUndoElem = null;
                        }
                    }
                }

            }
            //
            function getCopyElement(unit) {
                if (!unit.copyElement) {
                    markedElems.push(unit);
                    copyAnElement(unit);
                }
                return unit.copyElement;
            }
        }

        //创建元素拷贝
        function copyAnElement(elem) {
            var newElem;
            if (elem.nodeType === 1 && typeof elem.getAttribute("page-unitary") === "string") {
                newElem = elem.cloneNode(true);
            } else {
                newElem = elem.cloneNode(false);
            }
            if (newElem.nodeType === 3) {
                newElem.nodeValue = "";
            }
            elem.copyElement = newElem;
            return newElem;
        }
    }

    //渲染单页
    function render_page(htmlString, configData) {
        console.log('render_page', htmlString)
        return new Promise(function (res, rej) {
            var svg = htmlToSvg(htmlString, configData.page_w, configData.page_h);
            drawSvg(svg, configData.definitionRatio).then(function (img) {
                res(img);
            }).catch(function (err) {
                rej(err);
            });

        });
    }

    //创建单页容器
    function createPage(htmlString, style, configData) {
        //容器
        var pageContainer = document.createElement("div");
        pageContainer.setAttribute("style", `position:relative;width:${configData.page_w}px;height:${configData.page_h}px;display:block;background-color:#fff;`);
        //内容区域尺寸
        var contentSizeRuler = document.createElement("div");
        contentSizeRuler.className = "page_contentSizeRuler";
        contentSizeRuler.setAttribute("style", `position:absolute;left:${configData.paddingLeft};right:${configData.paddingRight};top:${configData.paddingTop};bottom:${configData.paddingBottom};`);
        pageContainer.appendChild(contentSizeRuler);
        //内容区域
        var contentWrapper = document.createElement("div");
        contentWrapper.className = "page_contentWrapper";
        contentWrapper.setAttribute("style", `font-family:${configData.fontFamily};font-size:${configData.fontSize};position:absolute;left:${configData.paddingLeft};right:${configData.paddingRight};top:${configData.paddingTop};display:block;overflow:visible;`);
        pageContainer.appendChild(contentWrapper);
        //
        contentWrapper.innerHTML = htmlString;
        //
        var styleElem = document.createElement("style");
        styleElem.innerHTML = style;
        pageContainer.appendChild(styleElem);

        return pageContainer;
    }

    //html转svg
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

    //svg转位图
    function drawSvg(svg, definitionRatio) {

        width = svg.width.baseVal.value * definitionRatio;
        height = svg.height.baseVal.value * definitionRatio;

        return new Promise(function (res, rej) {

            var _img = document.createElement("img");
            _img.crossOrigin = 'anonymous';

            _img.addEventListener("load", function () {
                var cvs = document.createElement("canvas");
                var ctx = cvs.getContext("2d");
                cvs.width = width;
                cvs.height = height;
                ctx.drawImage(_img, 0, 0, _img.width, _img.height, 0, 0, width, height);
                var newImg = document.createElement("img");
                try {
                    newImg.src = cvs.toDataURL('image/png');
                } catch (err) {
                    rej({
                        code: 1,
                        message: "您当前的系统不支持将题目导出为PDF"
                    });
                }
                res(newImg);
            });

            _img.addEventListener("error", function (err) {
                var newImg = document.createElement("img");
                newImg.src = blankImgSrc;
                res(newImg, err);
            });

            const t = "data:image/svg+xml;charset=utf-8," + (new XMLSerializer()).serializeToString(svg)
                .replace(/\r\n/g, '%0A').replace(/\r/g, '%0A').replace(/\n/g, '%0A')
                .replace(/\#/g, '%23').replace(/\?/g, '%3F').replace(/\&/g, '%26');
            console.log("=========", t)
            _img.src = t;

        });
    }

    //打包导出pdf
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

    //元素添加到dom:强制渲染
    function addToDom(elem) {
        var container = document.createElement("div");
        container.setAttribute("style", `position:absolute;width:0;height:0;visibility:hidden;border:0px none;overflow:hidden;`);
        document.body.appendChild(container);
        container.appendChild(elem);
        return {
            remove: function () {
                document.body.removeChild(container);
            }
        };
    }

    //元素添加到新建的iframe:强制渲染
    function addToIframe(elem) {
        var iframe = document.createElement("iframe");
        iframe.setAttribute("style", `position:absolute;width:0;height:0;visibility:hidden;border:0px none;overflow:hidden;`);
        document.body.appendChild(iframe);
        iframe.contentWindow.document.body.appendChild(elem);
        return {
            remove: function () {
                document.body.removeChild(iframe);
            }
        };
    }

})();