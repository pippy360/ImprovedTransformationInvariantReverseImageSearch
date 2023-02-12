

function getDataForShape(inShape, axisResX, axisResY, pointStart, pointEnd, maxSumVal)
{
    //FIXME: maybe use .map and test if it's faster, we don't need to iterate once at a time
    let arr = getDataForShape_flat(inShape, axisResX, axisResY, pointStart, pointEnd, maxSumVal);
    const newArr = [];
    while(arr.data.length) newArr.push(arr.data.splice(0,axisResX));
    return newArr;
}

function getDataForShape_flat(inShape, axisResX, axisResY, pointStart, pointEnd, maxSumVal)
{
    const transpt = findCentroid(inShape);
    const fixedShape = applyTransformationMatrixToAllKeypoints(inShape, getTranslateMatrix(-transpt[0], -transpt[1]));
    let dataArr = [];//new Array(axisResY*axisResX);

    for (let i = 0; i < axisResY; i++) {
        for (let j = 0; j < axisResX; j++) {
            let xlen = pointEnd[0] - pointStart[0];
            let ylen = pointEnd[1] - pointStart[1];
            let a = (pointStart[0]) + ((xlen/axisResX)*j);
            let b = (pointStart[1]) + ((ylen/axisResY)*i);
            let v = getSumVal(fixedShape, a, b, maxSumVal);

            //FIXME: do this with a map!
            if (v > maxSumVal)
                v = maxSumVal;

            if (!isFinite(v)) {
                console.log("Not finite for " + a + " : " + b);
                debugger;
            }

            dataArr.push(v);
        }
    }
    return {
        data: dataArr,
    }
}

function getTransformedBoundingBox(width, height, mat) {
    const initialBoundingBox = [
        [0,0],
        [0,height],
        [width, height],
        [width,0],
    ];
    const transformedShape = applyTransformationMatrixToAllKeypoints(initialBoundingBox, mat);
    let minX, maxX, minY, maxY;
    for (let i = 0; i < transformedShape.length; i++)
    {
        if (minX == undefined || transformedShape[i][0] < minX)
            minX = transformedShape[i][0];

        if (maxX == undefined || transformedShape[i][0] > maxX)
            maxX = transformedShape[i][0];

        if (minY == undefined || transformedShape[i][1] < minY)
            minY = transformedShape[i][1];

        if (maxY == undefined || transformedShape[i][1] > maxY)
            maxY = transformedShape[i][1];
    }
    return {
        minX: minX,
        maxX: maxX,
        minY: minY,
        maxY: maxY
    }
}

function drawDraggableOutput(d3VizId, draggableId, animatedCanvasId, matId, example, initialTransform, img) {
    const common = example.common;
    const offset = $("#" + draggableId).offset();
    const viz = $("#"+ d3VizId);
    const svgPos = viz.offset();
    const percX = ((offset.left + (28/2)) - svgPos.left)/viz.width();
    const percY = ((offset.top + (28/2)) - svgPos.top)/viz.height();
    const xval = common.pt1[0] + ((common.pt2[0] - common.pt1[0])*percX);
    const yval = common.pt1[1] + ((common.pt2[1] - common.pt1[1])*percY);

    fillDemoVals(matId, [
        [xval, yval],
        [0, 1.0/xval]
    ])

    const width = $("#graph2DDataViz_top").width();
    const height = $("#graph2DDataViz_top").height();
    let mat = getIdentityMatrix();
    mat = matrixMultiply(initialTransform, mat);

    //fix the rotation
    {
        const translateMat = getTranslateMatrix(-mat[0][2], -mat[1][2]);
        let degreeMat = matrixMultiply(translateMat, mat);
        const pt = applyTransformationMatrixToAllKeypoints([[1, 0]], degreeMat)[0];
        const degrees = 360-getAngleForOnePoint_matrix(pt);

        mat = matrixMultiply(getRotationMatrix(-degrees), mat);
    }

    //normalise the shape
    const computedMat = [
        [xval, yval, 0],
        [0, 1.0 / xval, 0],
        [0, 0, 1],
    ];
    mat = matrixMultiply(computedMat, mat);

    const shape = applyTransformationMatrixToAllKeypoints(common.shape, mat);

    const transpt = findCentroid(shape);
    mat = matrixMultiply(getTranslateMatrix(-transpt[0], -transpt[1]), mat);

    const areaScale = Math.sqrt(20000/calcPolygonArea(shape));
    mat = matrixMultiply(getScaleMatrix(areaScale, areaScale), mat);

    const mat_trans = matrixMultiply(getTranslateMatrix(width/2, height/2), mat)
    drawImageAndShapeWithTransformation(animatedCanvasId, img, common.shape, mat_trans, img.width, img.height);

    updateHashValues();

    return mat;
}

function drawVizBoxes(noChangesId_top, noChangesId_bottom, topTransform, bottomTransform,
                      draggableMat_top, draggableMat_bottom, shape)
{
    let topCanvas    = getCleanUICanvas(noChangesId_top);
    let bottomCanvas = getCleanUICanvas(noChangesId_bottom);

    let shapeTop = square_shape_small;
    shapeTop = applyTransformationMatrixToAllKeypoints(shapeTop, getScaleMatrix(150, 150));
    shapeTop = applyTransformationMatrixToAllKeypoints(shapeTop, math.inv(draggableMat_top));
    shapeTop = applyTransformationMatrixToAllKeypoints(shapeTop, topTransform);

    let shapeBottom = square_shape_small;
    shapeBottom = applyTransformationMatrixToAllKeypoints(shapeBottom, getScaleMatrix(150, 150));
    shapeBottom = applyTransformationMatrixToAllKeypoints(shapeBottom, math.inv(draggableMat_bottom));
    shapeBottom = applyTransformationMatrixToAllKeypoints(shapeBottom, bottomTransform);

    let shapeBottom_top = square_shape_small;
    shapeBottom_top = applyTransformationMatrixToAllKeypoints(shapeBottom_top, getScaleMatrix(150, 150));
    shapeBottom_top = applyTransformationMatrixToAllKeypoints(shapeBottom_top, math.inv(draggableMat_top));
    shapeBottom_top = applyTransformationMatrixToAllKeypoints(shapeBottom_top, bottomTransform);

    let shapeTop_bottom = square_shape_small;
    shapeTop_bottom = applyTransformationMatrixToAllKeypoints(shapeTop_bottom, getScaleMatrix(150, 150));
    shapeTop_bottom = applyTransformationMatrixToAllKeypoints(shapeTop_bottom, math.inv(draggableMat_bottom));
    shapeTop_bottom = applyTransformationMatrixToAllKeypoints(shapeTop_bottom, topTransform);

    let fragShapeTop = applyTransformationMatrixToAllKeypoints(shape, topTransform);
    drawPolyFullNoFill(topCanvas.ctx_ui, shapeTop, 'rgb(251, 188, 4)')
    drawPolyFullNoFill(topCanvas.ctx_ui, shapeTop_bottom, 'rgb(52, 168, 83)')
    drawPolyFull(topCanvas.ctx_ui, fragShapeTop);

    let fragShapeBottom = applyTransformationMatrixToAllKeypoints(shape, bottomTransform);
    drawPolyFullNoFill(bottomCanvas.ctx_ui, shapeBottom_top, 'rgb(251, 188, 4)')
    drawPolyFullNoFill(bottomCanvas.ctx_ui, shapeBottom, 'rgb(52, 168, 83)')
    drawPolyFull(bottomCanvas.ctx_ui, fragShapeBottom);
}

async function initGraph(example) {
    let g_draggableMat_top      = getIdentityMatrix();
    let g_draggableMat_bottom   = getIdentityMatrix();

    g_transformState = await init_loadTransformStateAndImages(example.common.imgsrc, example.top.initialTransform,
        example.bottom.initialTransform);
    const d3VizId_top = "graph2DDataViz_top", draggableId_top = "draggableButton_top",
        animatedCanvasId_top = "transformedImageAndShape_top", noChangesId_top = "imageNoChanges_top",
        imageScaledId_top = "imageScaled_top", matId_top = "topMatV";

    const d3VizId_bottom = "graph2DDataViz_bottom", draggableId_bottom = "draggableButton_bottom",
        animatedCanvasId_bottom = "transformedImageAndShape_bottom", noChangesId_bottom = "imageNoChanges_bottom",
        imageScaledId_bottom = "imageScaled_bottom", matId_bottom = "bottomMatV";

    $("#" + draggableId_top ).draggable({
        drag: function () {
            const layerImage = g_transformState.activeCanvas.activeLayer.image;
            const topTrans = g_transformState.interactiveCanvasState.layers[0].appliedTransformationsMat;
            g_draggableMat_top = drawDraggableOutput(d3VizId_top, draggableId_top, animatedCanvasId_top, matId_top, example,
                topTrans, layerImage);
            drawVizBoxes(
                noChangesId_top,
                noChangesId_bottom,
                g_transformState.interactiveCanvasState.layers[0].appliedTransformationsMat,
                g_transformState.databaseCanvasState.layers[0].appliedTransformationsMat,
                g_draggableMat_top,
                g_draggableMat_bottom,
                example.common.shape
            );
        }
    });
    $("#" + draggableId_bottom ).draggable({
        drag: function () {
            const layerImage = g_transformState.activeCanvas.activeLayer.image;
            const bottomTrans = g_transformState.databaseCanvasState.layers[0].appliedTransformationsMat;
            g_draggableMat_bottom = drawDraggableOutput(d3VizId_bottom, draggableId_bottom, animatedCanvasId_bottom, matId_bottom, example,
                bottomTrans, layerImage);
            drawVizBoxes(
                noChangesId_top,
                noChangesId_bottom,
                g_transformState.interactiveCanvasState.layers[0].appliedTransformationsMat,
                g_transformState.databaseCanvasState.layers[0].appliedTransformationsMat,
                g_draggableMat_top,
                g_draggableMat_bottom,
                example.common.shape
            );
        }
    });

    g_transformState.currentExample = example;
    trasformOperationDraw(g_transformState);

    g_transformState.interactiveCanvasState.draw = function () {
        if (g_transformState == undefined)
            return;

        $("#viz2doutput_" + d3VizId_top).remove();
        const layerImage = g_transformState.activeCanvas.activeLayer.image;
        drawGraph(d3VizId_top, draggableId_top, animatedCanvasId_top, noChangesId_top, imageScaledId_top, example.common,
            g_transformState.interactiveCanvasState.layers[0].appliedTransformationsMat, matId_top, layerImage);
        g_draggableMat_top = drawDraggableOutput(d3VizId_top, draggableId_top, animatedCanvasId_top, matId_top, example,
            g_transformState.interactiveCanvasState.layers[0].appliedTransformationsMat, layerImage);
        drawVizBoxes(
            noChangesId_top,
            noChangesId_bottom,
            g_transformState.interactiveCanvasState.layers[0].appliedTransformationsMat,
            g_transformState.databaseCanvasState.layers[0].appliedTransformationsMat,
            g_draggableMat_top,
            g_draggableMat_bottom,
            example.common.shape
        );
    }

    g_transformState.databaseCanvasState.draw = function () {
        if (g_transformState == undefined)
            return;

        $("#viz2doutput_" + d3VizId_bottom).remove();
        const layerImage = g_transformState.activeCanvas.activeLayer.image;
        drawGraph(d3VizId_bottom, draggableId_bottom, animatedCanvasId_bottom, noChangesId_bottom, imageScaledId_bottom,
            example.common, g_transformState.databaseCanvasState.layers[0].appliedTransformationsMat, matId_bottom, layerImage);
        g_draggableMat_bottom = drawDraggableOutput(d3VizId_bottom, draggableId_bottom, animatedCanvasId_bottom, matId_bottom, example,
            g_transformState.databaseCanvasState.layers[0].appliedTransformationsMat, layerImage);
        drawVizBoxes(
            noChangesId_top,
            noChangesId_bottom,
            g_transformState.interactiveCanvasState.layers[0].appliedTransformationsMat,
            g_transformState.databaseCanvasState.layers[0].appliedTransformationsMat,
            g_draggableMat_top,
            g_draggableMat_bottom,
            example.common.shape
        );
    }

    g_drawWithNewStartAndEnd = function(top, bottom) {
        example.common.top2dVizBound = top;
        example.common.bottom2dVizBound = bottom;

        g_transformState.interactiveCanvasState.draw();
        g_transformState.databaseCanvasState.draw();
    }


    g_transformState.interactiveCanvasState.draw();
    g_transformState.databaseCanvasState.draw();
}

function getRotationFixHack(inMat) {
    const translateMat = getTranslateMatrix(-inMat[0][2], -inMat[1][2]);
    let degreeMat = matrixMultiply(translateMat, inMat);
    const pt = applyTransformationMatrixToAllKeypoints([[1, 0]], degreeMat)[0];
    const degrees = 360-getAngleForOnePoint_matrix(pt);

    return getRotationMatrix(-degrees);
}

let g_drawWithNewStartAndEnd;

function drawGraph(d3VizId, draggableId, animatedCanvasId, noChangesId, imageScaledId, shapeContainer, initialTransform, matId, inimg) {
    if (g_transformState.currentExample == undefined || inimg.src == undefined)
        return

    //Draw the shape on the useable canvas
    let canvasObj = getCleanUICanvas(noChangesId);
    drawPolyFull(canvasObj.ctx_ui, applyTransformationMatrixToAllKeypoints(shapeContainer.shape, initialTransform));

    const degrees = -Math.atan(-initialTransform[1][0]/initialTransform[1][1]) * 180.0/Math.PI;
    initialTransform = matrixMultiply(getRotationMatrix(-degrees), initialTransform);

    const width = $("#graph2DDataViz_top").width();
    const height = $("#graph2DDataViz_top").height()
    const imgWidth = inimg.width;
    const imgHeight = inimg.height;

    let transmat = getIdentityMatrix();
    transmat = matrixMultiply(getTranslateMatrix(-imgWidth/2, -imgHeight/2), transmat);
    transmat = matrixMultiply(initialTransform, transmat);
    transmat = matrixMultiply(getRotationFixHack(transmat), transmat);

    let shape = applyTransformationMatrixToAllKeypoints(shapeContainer.shape, transmat)
    const transpt = findCentroid(shape);
    transmat = matrixMultiply(getTranslateMatrix(-transpt[0], -transpt[1]), transmat);

    const areaScale = Math.sqrt(20000/calcPolygonArea(shape));
    transmat = matrixMultiply(getScaleMatrix(areaScale, areaScale), transmat);

    shape = applyTransformationMatrixToAllKeypoints(shapeContainer.shape, transmat)

    transmat = matrixMultiply(getTranslateMatrix(width/2, height/2), transmat);

    // drawImageAndShapeWithTransformation(imageScaledId, inimg, shapeContainer.shape, transmat, imgWidth, imgHeight);

    const resolutionX = width/5;
    const resolutionY = height/5;
    const ret = getDataForShape_flat(shape, resolutionX, resolutionY, shapeContainer.pt1, shapeContainer.pt2, shapeContainer.maxSumVal2d);
    const min = Math.min(...ret.data);
    const max = Math.max(...ret.data);
    ret.data.forEach(x => {return Math.min(shapeContainer.maxSumVal2d, x)});

    const step = (Math.log2(Math.log2(max))-Math.log2(Math.log2(min)))/10.0;
    const thresholds = d3.range(Math.log2(Math.log2(min)), Math.log2(Math.log2(max)), step).map(i => Math.pow(2, Math.pow(2, i)))
    const contours = d3.contours()
        .size([resolutionX, resolutionY])
        .thresholds(thresholds)
        (ret.data)

    const color = d3.scaleSequentialLog(d3.extent(thresholds), d3.interpolateLab("#a9bccb", "#f0f4f6"));
    //find in document instead
    const svg = d3.select("#" + d3VizId)
        .append("svg")
        .attr("id", "viz2doutput_"+d3VizId)
        .attr("viewBox", [0, 0, resolutionX, resolutionY])
        .style("display", "block")
        .style("width", "100%")

    // <circle cx="738" cy="165.00000000000003" r="7" stroke="#3f5b75" stroke-width="1" fill="none"></circle>
    // <path d="M738,158.00000000000003,L738,150.00000000000003" stroke="#3f5b75" stroke-width="1" fill="none"></path>
    // <text className="figtext" transform="translate(713,146.00000000000003)">Optimum</text>

    const g = svg.append("g");
    g.attr("fill", "none").selectAll("path");

    const path = d3.geoPath()
    for (let i = 0; i < thresholds.length; i++) {
        //thresholds
        const _contour = contours[i];
        const threshold = thresholds[i]
        g.append("path")
            .attr("d", path(_contour))
            .attr("fill", color(threshold))
            .attr("stroke", "#96b0c0")
            .attr("stroke-width", ".1")
        // .attr("stroke-opacity", 0.9);
    }

    //FIXME: are we doing this twice?
    const transpt2 = findCentroid(shape);
    shape = applyTransformationMatrixToAllKeypoints(shape, getTranslateMatrix(-transpt2[0], -transpt2[1]));
    const k2 = get_b(shape);
    const k1 = get_a(shape);
    const aPerc = (k1 - shapeContainer.pt1[0])/(shapeContainer.pt2[0]-shapeContainer.pt1[0]);
    const bPerc = (k2 - shapeContainer.pt1[1])/(shapeContainer.pt2[1]-shapeContainer.pt1[1]);

    const aPos = (width*aPerc)/5.0;
    const bPos = (height*bPerc)/5.0;

    svg.append("circle")
        .attr("stroke", "#3f5b75")
        .attr("stroke-width", ".2")
        .attr("r", "1.2")
        .attr("fill", "none")
        .attr("transform", "translate("+ aPos +", "+ bPos +")");

    svg.append("path")
        .attr("d", "M 0 0 L 0 1.8")
        .attr("stroke", "#3f5b75")
        .attr("stroke-width", ".2")
        .attr("transform", "translate("+ aPos +", "+ (bPos-3) +")");

    svg.append("text")
        .text("Optimum")
        .attr("font-weight", "bold")
        .attr("font-size", "2.4px")
        .attr("transform", "translate("+ (aPos-5) +", "+ (bPos-4) +")");
}

const spirited05_shape_wrap_inner = {
    top2dVizBound    : 10000000,
    bottom2dVizBound : 0,
    imgsrc: "images/spirited05.jpg",
    shape:
        [
            [397.565, 353.21], [393.345, 334.21999999999997], [389.125, 327.89], [376.46500000000003, 315.22999999999996], [372.245, 313.11999999999995], [365.915, 311.01], [349.035, 311.01], [342.70500000000004, 313.11999999999995], [334.265, 317.34], [327.93500000000006, 321.55999999999995], [323.71500000000003, 325.78], [319.495, 332.10999999999996], [317.385, 338.43999999999994], [317.385, 342.65999999999997], [319.495, 351.09999999999997], [325.82500000000005, 359.53999999999996], [332.15500000000003, 365.86999999999995], [338.485, 370.09], [349.035, 374.30999999999995], [368.025, 374.30999999999995], [380.685, 370.09], [387.015, 365.86999999999995], [393.345, 359.53999999999996], [397.565, 353.21]
        ],
    maxSumVal: 500000000000000000,
    img: null,
    scale: .5,
    pt1: [ .5, -2],
    pt2: [ 1.5,  2]
};

const spirited05exampleWrapper = {
    common: spirited05_shape_wrap_inner,
    top: {
        initialTransform: [
            [ 0.8312902887697305, 0.3060914847098115, -306.7234721186111 ],
            [ -1.1738035208450872, 1.2952668063590556, 141.23853998078266],
            [0, 0, 1]
        ]
    },
    bottom: {
        initialTransform: [
            [ 0.3, 0, -33 ],
            [ 0, 0.3, 43 ],
            [0, 0, 1]
        ]
    }
};

const spirited01_shape_wrap_inner = {
    top2dVizBound    : 10000000,
    bottom2dVizBound : 0,
    imgsrc: "images/spirited01.jpg",
    // shape: [[446, 350], [444, 340], [443, 338], [441, 336], [439, 335], [435, 335], [431, 336], [429, 337], [422, 342], [421, 343], [417, 365], [417, 368], [418, 369], [420, 370], [423, 370], [433, 367], [438, 362], [446, 350]],
    shape:
        [
            [487, 446], [485, 430], [482, 427], [479, 428], [475, 430], [473, 432], [467, 442], [466, 444], [466, 448], [467, 450], [469, 453], [471, 455], [473, 456], [480, 456], [483, 454], [485, 452], [486, 450], [487, 446]
        ],
    maxSumVal: 500000000000000000,
    img: null,
    scale: .5,
    pt1: [ .5, -2],
    pt2: [ 1.5,  2]
};

const spirited01exampleWrapper = {
    common: spirited01_shape_wrap_inner,
    top: {
        initialTransform: [
            [ 0.8312902887697305, 0.3060914847098115, -306.7234721186111 ],
            [ -1.1738035208450872, 1.2952668063590556, 141.23853998078266 ],
            [0, 0, 1]
        ]
    },
    bottom: {
        initialTransform: [
            [0.40188679245283015, 0, -49.88409481408459],
            [0, 0.40188679245283015, 47.24327922317218],
            [0, 0, 1]
        ]
    }
};

const spirited02_shape_wrap_inner = {
    top2dVizBound    : 10000000,
    bottom2dVizBound : 0,
    imgsrc: "images/spirited01.jpg",
    shape: [
        [268.248302617219, 245.5956987035264], [259.77636797186113, 235.5345693750273], [255.4668791869728, 232.30528053490755], [249.78310460847837, 228.74231736629912], [245.1399414951013, 226.8873143197855], [239.12249258811812, 224.69863694478317], [225.37963465205695, 221.36189365989588], [210.96942805901836, 220.77372196222083], [166.73778529443626, 223.13206425001403], [154.67460999500474, 239.8497136570086], [139.94204006766353, 267.56164941285215], [169.197926529904, 332.8769853402474], [170.23853799502143, 334.58494546234226], [183.68731008224506, 345.1267920437489], [197.95047375086494, 349.31751538968354], [225.43618962298723, 355.9910019594581], [231.78731285845913, 356.8053935408543], [236.7641503003249, 357.28611079376185], [243.96925359684423, 357.5801966425994], [252.02833695441097, 357.35397675887816], [254.25660280906447, 357.1673453548082], [260.42109464046644, 355.7534710815509], [264.3573206172148, 354.52622821236355], [265.2113006782622, 354.0059224798049], [269.2945695794294, 349.17612796235784], [275.37988445152894, 336.1006186832741], [277.04825609397255, 329.22918971524354], [278.89194814630014, 297.660204941954], [280.2549229457202, 271.06805761053033], [268.248302617219, 245.5956987035264]
    ],
    maxSumVal: 500000000000000000,
    img: null,
    scale: .5,
    pt1: [ .5, -2],
    pt2: [ 1.5,  2]
};

const spirited02exampleWrapper = {
    common: spirited02_shape_wrap_inner,
    top: {
        initialTransform: [
            [-0.46921105499074256, -0.5664051792314311, 488.3474366153255],
            [0.04422850810106058, -0.4914884807142779, 283.99669667301845],
            [0, 0, 1]
        ]
    },
    bottom: {
        initialTransform: [
            [0.40188679245283015, 0, -49.88409481408459],
            [0, 0.40188679245283015, 47.24327922317218],
            [0, 0, 1]
        ]
    }
};

const spirited03_shape_wrap_inner = {
    top2dVizBound    : 10000000,
    bottom2dVizBound : 0,
    imgsrc: "images/spirited07.jpg",
    shape: [[509, 372], [505, 356], [503, 351], [502, 349], [500, 347], [478, 328], [467, 321], [463, 321], [454, 322], [444, 331], [442, 333], [402, 374], [395, 384], [393, 387], [392, 389], [390, 394], [390, 398], [449, 442], [453, 444], [454, 444], [463, 441], [466, 439], [473, 432], [509, 372]],
    maxSumVal: 500000000000000000,
    img: null,
    scale: .5,
    pt1: [ .5, -2],
    pt2: [ 1.5,  2]
}

const spirited03exampleWrapper = {
    common: spirited03_shape_wrap_inner,
    top: {
        initialTransform: [
            [ 0.42734775524029367, -0.36105040311936343, 126.7601063263246 ],
            [ 0.4936451073612238, 0.2011634530524589, -117.9592775937198 ],
            [0, 0, 1]
        ]
    },
    bottom: {
        initialTransform: [
            [ 0.36, 0, 34.886669921875004 ],
            [ 0, 0.36, -0.12000122070311647 ],
            [0, 0, 1]
        ]
    }
}

const spirited04_shape_wrap_inner = {
    top2dVizBound    : 10000000,
    bottom2dVizBound : 0,
    imgsrc: "images/spirited07.jpg",
    shape: [[287, 373], [286, 368], [283, 364], [282, 363], [278, 362], [277, 362], [273, 363], [271, 364], [269, 366], [268, 369], [268, 375], [270, 378], [274, 380], [280, 380], [283, 379], [286, 376], [287, 373]],
    maxSumVal: 500000000000000000,
    img: null,
    scale: .5,
    pt1: [ .5, -2],
    pt2: [ 1.5,  2]
}

const spirited04exampleWrapper = {
    common: spirited04_shape_wrap_inner,
    top: {
        initialTransform: [
            [ 0.8530412611054635, -0.7207031917750389, 173.7116521100151 ],
            [ 0.985379330435888, 0.40154820886729536, -279.92453488539144 ],
            [0, 0, 1]
        ]
    },
    bottom: {
        initialTransform: [
            [0.576, 0, -23.761318359374968 ],
            [0, 0.576, -84.08799438476561],
            [0, 0, 1]
        ]
    }
}

const soup_e = {
    top2dVizBound    : 10000000,
    bottom2dVizBound : 0,
    imgsrc: "images/soup.jpg",
    // shape: [[446, 350], [444, 340], [443, 338], [441, 336], [439, 335], [435, 335], [431, 336], [429, 337], [422, 342], [421, 343], [417, 365], [417, 368], [418, 369], [420, 370], [423, 370], [433, 367], [438, 362], [446, 350]],
    shape: [[435, 370], [434, 365], [431, 362], [425, 362], [415, 372], [412, 376], [410, 379], [405, 387], [398, 401], [396, 407], [395, 411], [395, 417], [398, 420], [401, 420], [403, 419], [407, 416], [413, 410], [418, 404], [424, 396], [429, 388], [431, 384], [432, 381], [434, 374], [435, 370]],
    maxSumVal: 500000000000000000,
    img: null,
    scale: .5,
    pt1: [ .6, -.1],
    pt2: [ 3,  3]
}


const soupexampleWrapper = {
    common: soup_e,
    top: {
        initialTransform: [
            [0.5886950685246691, -0.05003623135599416, -44.644694691458156],
            [-0.04179351546189566, 0.3702222305938821, 23.0607250567993],
            [0, 0, 1]
        ]
    },
    bottom: {
        initialTransform: [
            [0.4142014727158753, 0, -20.591978666721896],
            [0, 0.32873132755228196, -1.631973868323188],
            [0, 0, 1]
        ]
    }
}

const font_wrap_inner = {
    top2dVizBound    : 10000000,
    bottom2dVizBound : 0,
    imgsrc: "images/font.jpg",
    // shape: [[446, 350], [444, 340], [443, 338], [441, 336], [439, 335], [435, 335], [431, 336], [429, 337], [422, 342], [421, 343], [417, 365], [417, 368], [418, 369], [420, 370], [423, 370], [433, 367], [438, 362], [446, 350]],
    shape: [[1149, 702], [1148, 681], [1145, 672], [1142, 667], [1139, 663], [1133, 657], [1070, 609], [1010, 609], [1009, 610], [1009, 634], [1028, 736], [1029, 738], [1031, 739], [1104, 739], [1111, 738], [1116, 737], [1123, 735], [1131, 731], [1134, 729], [1141, 722], [1143, 719], [1146, 713], [1148, 707], [1149, 702]],
    maxSumVal: 500000000000000000,
    img: null,
    scale: .5,
    pt1: [ .5, -2],
    pt2: [ 1.5,  2]
}

const fontImageWrapper = {
    common: font_wrap_inner,
    top: {
        initialTransform: [
            [0.11902841730170197, 0.21010441775692265, -127.84798440924405],
            [-0.11719579812102442, 0.01954896495813436, 227.61805097971387],
            [0, 0, 1]
        ]
    },
    bottom: {
        initialTransform: [
            [0.1535211267605634, 0, 19.97585482888377],
            [0, 0.1535211267605634, -13.259561601379133],
            [0, 0, 1]
        ]
    }
}


const square_shape_wrap_inner = {
    top2dVizBound    : 10000000,
    bottom2dVizBound : 0,
    imgsrc: "images/basicshapes.png",
    shape: [[1042, 853], [1040, 557], [624, 557], [622, 559], [622, 853], [623, 854], [1041, 854], [1042, 853]],
    maxSumVal: 500000000000000000,
    img: null,
    scale: .5,
    pt1: [ .5, -.5],
    pt2: [ 1.5,  .5]
}

const circle_shape_wrap_inner = {
    top2dVizBound    : 10000000,
    bottom2dVizBound : 0,
    imgsrc: "images/basicshapes.png",
    shape: [[482, 309],[481, 269],[480, 262],[478, 252],[475, 240],[470, 225],[468, 220],[464, 211],[460, 203],[455, 194],[445, 179],[442, 175],[438, 170],[432, 163],[419, 150],[412, 144],[406, 139],[402, 136],[387, 126],[380, 122],[366, 115],[357, 111],[339, 105],[327, 102],[322, 101],[308, 99],[295, 98],[278, 98],[265, 99],[251, 101],[246, 102],[234, 105],[216, 111],[207, 115],[193, 122],[186, 126],[178, 131],[171, 136],[167, 139],[161, 144],[154, 150],[141, 163],[135, 170],[131, 175],[128, 179],[118, 194],[114, 201],[109, 211],[105, 220],[103, 225],[98, 240],[96, 247],[94, 256],[93, 262],[92, 269],[91, 278],[91, 309],[92, 319],[93, 326],[94, 332],[98, 348],[103, 363],[105, 368],[109, 377],[113, 385],[118, 394],[128, 409],[131, 413],[135, 418],[142, 426],[151, 435],[161, 444],[166, 448],[174, 454],[186, 462],[193, 466],[207, 473],[214, 476],[219, 478],[231, 482],[238, 484],[247, 486],[252, 487],[258, 488],[265, 489],[278, 490],[295, 490],[307, 489],[315, 488],[321, 487],[326, 486],[335, 484],[342, 482],[354, 478],[359, 476],[366, 473],[380, 466],[387, 462],[399, 454],[407, 448],[412, 444],[422, 435],[430, 427],[438, 418],[442, 413],[445, 409],[453, 397],[456, 392],[460, 385],[464, 377],[468, 368],[470, 363],[475, 348],[478, 336],[480, 326],[481, 319],[482, 309]],
    maxSumVal: 5000000000000,
    maxSumVal2d: 10000000,
    img: null,
    scale: .5,
    pt1: [ .5, -.5],
    pt2: [ 1.5,  .5]
}

const circleExampleWrapper = {
    common: circle_shape_wrap_inner,
    top: {
        initialTransform: [
            [0.08194226790696515, -0.19021100421053733, 195.82989735468934],
            [0.13572836752161654, 0.1600432025371229, 8.775701960557186],
            [0, 0, 1]
        ]
    },
    bottom: {
        initialTransform: [
            [-0.01792971240495661, 0.21147532771353125, 5.90739029333916],
            [-0.21147532771353125, -0.01792971240495661, 285.30631114150816],
            [0, 0, 1]
        ]
    }
}

const call_of_duty_inner = {
    top2dVizBound    : 10000000,
    bottom2dVizBound : 0,
    imgsrc: "images/IMG_20191024_130833.jpg",
    shape: call_of_duty_shape,
    maxSumVal: 400000,
    maxSumVal2d: 1000000,
    img: null,
    scale: 1,
    pt1: [-0, -3],
    pt2: [ 2,  3]
}

const callofdutyexampleWrapper = {
    common: call_of_duty_inner,
    top: {
        initialTransform: [
            [0.5026551720735997, -0.42467487024743916, 104.88833944275008],
            [0.5806354738997599, 0.23661256873139938, -97.97404014190421],
            [0, 0, 1]
        ]
    },
    bottom: {
        initialTransform: [
            [0.1948051948051948, 0, 23.58812386648996],
            [0, 0.1948051948051948, -24.44876296798904],
            [0, 0, 1]
        ]
    }
}


function loadVizDemo(example) {
    initGraph(example);
}

window.addEventListener("DOMContentLoaded", function(event) {
    loadVizDemo(soupexampleWrapper);
});

let updateHashValues = function () {
    const topId = "transformedImageAndShape_top";
    const bottomId = "transformedImageAndShape_bottom";

    const topHash = pHash(document.getElementById(topId));
    const bottomHash = pHash(document.getElementById(bottomId));

    const dist = distance(topHash, bottomHash)
    const topOutput = document.getElementById("topHashOutput");
    const bottomOutput = document.getElementById("bottomHashOutput");
    const hashDistOutput = document.getElementById("hashDistOutput");

    topOutput.innerHTML = binaryToHex(topHash).result;
    bottomOutput.innerHTML = binaryToHex(bottomHash).result;
    if (dist < 8)
        hashDistOutput.innerHTML = ""+dist + " <span style='color: rgba(44, 102, 46, .9)'>(Match)</span>";
    else
        hashDistOutput.innerHTML = ""+dist + " <span style='color: rgba(244, 67, 54, .9)'>(No Match)</span>";
}

$(document).mousedown(function (e) {
    //ignore
});